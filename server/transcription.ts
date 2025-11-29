// Referenced from blueprint: javascript_gemini_ai_integrations
// AI-powered video transcription service using Gemini

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import pLimit from "p-limit";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";

const execPromise = promisify(exec);

const CHUNK_SIZE_BYTES = 7 * 1024 * 1024; // 7MB to stay safely under 8MB limit

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

function isTransientError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  const statusMatch = errorMsg.match(/(\d{3})/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 500 && status < 600) return true;
    if (status === 429) return true;
  }
  if (isRateLimitError(error)) return true;
  if (errorMsg.includes("ECONNRESET") || 
      errorMsg.includes("ETIMEDOUT") || 
      errorMsg.includes("network") ||
      errorMsg.includes("fetch failed")) return true;
  return false;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 7,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (!isTransientError(error)) {
        console.log(`Non-retryable error encountered: ${error.message}`);
        throw error;
      }
      
      if (attempt === maxRetries - 1) {
        console.log(`Max retries (${maxRetries}) exceeded`);
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Transient error, retry attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

interface TranscriptionSegment {
  startTime: number;
  endTime: number;
  text: string;
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function generateVTT(segments: TranscriptionSegment[]): string {
  let vtt = "WEBVTT\n\n";
  
  segments.forEach((segment, index) => {
    vtt += `${index + 1}\n`;
    vtt += `${formatVTTTime(segment.startTime)} --> ${formatVTTTime(segment.endTime)}\n`;
    vtt += `${segment.text}\n\n`;
  });
  
  return vtt;
}

async function extractAudio(videoPath: string, outputPath: string): Promise<void> {
  await execPromise(
    `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k -y "${outputPath}" 2>&1`
  );
}

async function getAudioDuration(audioPath: string): Promise<number> {
  const { stdout } = await execPromise(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

async function chunkAudio(audioPath: string, tempDir: string): Promise<{ path: string; startTime: number; duration: number }[]> {
  const stats = fs.statSync(audioPath);
  const totalDuration = await getAudioDuration(audioPath);
  
  if (stats.size <= CHUNK_SIZE_BYTES) {
    return [{ path: audioPath, startTime: 0, duration: totalDuration }];
  }
  
  const numChunks = Math.ceil(stats.size / CHUNK_SIZE_BYTES);
  const segmentDuration = totalDuration / numChunks;
  const chunks: { path: string; startTime: number; duration: number }[] = [];
  
  for (let i = 0; i < numChunks; i++) {
    const outputPath = path.join(tempDir, `chunk_${i}.mp3`);
    const startTime = i * segmentDuration;
    
    await execPromise(
      `ffmpeg -i "${audioPath}" -ss ${startTime} -t ${segmentDuration} -c copy -y "${outputPath}" 2>&1`
    );
    
    chunks.push({
      path: outputPath,
      startTime,
      duration: segmentDuration
    });
  }
  
  return chunks;
}

async function transcribeAudioChunk(
  audioPath: string,
  chunkStartTime: number,
  chunkDuration: number
): Promise<TranscriptionSegment[]> {
  const audioBuffer = fs.readFileSync(audioPath);
  const base64Audio = audioBuffer.toString("base64");
  
  const prompt = `You are a professional transcriptionist. Transcribe the following audio exactly as spoken.
Output format: Return a JSON array of segments, each with "start", "end" (in seconds relative to this chunk), and "text".
Break the transcription into natural segments of 5-10 seconds each.
Example: [{"start": 0, "end": 5.5, "text": "Hello and welcome"}, {"start": 5.5, "end": 12, "text": "Today we'll discuss..."}]
Only output valid JSON, no other text.`;

  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "audio/mp3", data: base64Audio } }
        ]
      }]
    });
  });

  const text = response.text || "[]";
  
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("No JSON array found in response, creating single segment");
      return [{
        startTime: chunkStartTime,
        endTime: chunkStartTime + chunkDuration,
        text: text.trim()
      }];
    }
    
    const segments = JSON.parse(jsonMatch[0]) as Array<{ start: number; end: number; text: string }>;
    
    return segments.map(seg => ({
      startTime: chunkStartTime + seg.start,
      endTime: chunkStartTime + seg.end,
      text: seg.text
    }));
  } catch (e) {
    console.error("Failed to parse transcription response:", e);
    return [{
      startTime: chunkStartTime,
      endTime: chunkStartTime + chunkDuration,
      text: text.replace(/```json/g, '').replace(/```/g, '').trim()
    }];
  }
}

export async function transcribeVideo(objectPath: string): Promise<string> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcribe-'));
  const videoPath = path.join(tempDir, 'video.mp4');
  const audioPath = path.join(tempDir, 'audio.mp3');
  
  try {
    console.log(`Starting transcription for: ${objectPath}`);
    
    const objectStorage = new ObjectStorageService();
    const file = await objectStorage.getObjectEntityFile(objectPath);
    
    console.log("Downloading video from object storage...");
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(videoPath);
      file.createReadStream()
        .on('error', reject)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
    
    console.log("Extracting audio...");
    await extractAudio(videoPath, audioPath);
    
    console.log("Chunking audio if needed...");
    const chunks = await chunkAudio(audioPath, tempDir);
    console.log(`Processing ${chunks.length} audio chunk(s)...`);
    
    const totalDuration = await getAudioDuration(audioPath);
    
    const limit = pLimit(2);
    const allSegments: TranscriptionSegment[] = [];
    
    const chunkPromises = chunks.map((chunk, i) =>
      limit(async () => {
        console.log(`Transcribing chunk ${i + 1}/${chunks.length}...`);
        const segments = await transcribeAudioChunk(chunk.path, chunk.startTime, chunk.duration);
        return { index: i, segments };
      })
    );
    
    const results = await Promise.all(chunkPromises);
    
    results.sort((a, b) => a.index - b.index);
    for (const result of results) {
      allSegments.push(...result.segments);
    }
    
    allSegments.sort((a, b) => a.startTime - b.startTime);
    
    const clampedSegments = allSegments.map(seg => ({
      ...seg,
      startTime: Math.max(0, Math.min(seg.startTime, totalDuration)),
      endTime: Math.max(0, Math.min(seg.endTime, totalDuration))
    })).filter(seg => seg.startTime < seg.endTime);
    
    console.log(`Generated ${clampedSegments.length} caption segments`);
    
    const vttContent = generateVTT(clampedSegments);
    return vttContent;
    
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function uploadCaptions(vttContent: string, videoId: number): Promise<string> {
  const objectStorage = new ObjectStorageService();
  const privateDir = objectStorage.getPrivateObjectDir();
  
  const captionsPath = `${privateDir}/captions/${videoId}.vtt`;
  const { bucketName, objectName } = parseObjectPath(captionsPath);
  
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  
  await file.save(vttContent, {
    contentType: 'text/vtt',
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });
  
  return `/objects/captions/${videoId}.vtt`;
}

function parseObjectPath(pathStr: string): { bucketName: string; objectName: string } {
  if (!pathStr.startsWith("/")) {
    pathStr = `/${pathStr}`;
  }
  const pathParts = pathStr.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}
