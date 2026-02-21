import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Sparkles, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportVoiceRecordingWidgetProps {
    fieldId: string;
    initialAudioUrl: string | null;
    onTranscription: (audioUrl: string | null, transcribedText: string | null) => Promise<void>;
    onAudioSaved: (audioUrl: string | null) => Promise<void>;
}

export function ReportVoiceRecordingWidget({
    fieldId,
    initialAudioUrl,
    onTranscription,
    onAudioSaved,
}: ReportVoiceRecordingWidgetProps) {
    const { toast } = useToast();

    const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl);
    const audioUrlRef = useRef<string | null>(initialAudioUrl);

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [hasRecorded, setHasRecorded] = useState(!!initialAudioUrl);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [isUploadingAudio, setIsUploadingAudio] = useState(false);

    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (initialAudioUrl !== audioUrlRef.current) {
            audioUrlRef.current = initialAudioUrl;
            setAudioUrl(initialAudioUrl);
            if (initialAudioUrl) {
                setHasRecorded(true);
            }
        }
    }, [initialAudioUrl]);

    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    return (
        <div className="pt-2 space-y-2 no-print">
            <Label className="text-sm font-bold text-muted-foreground mt-2 inline-block">
                Voice Recording
            </Label>
            <div className="flex flex-wrap items-center gap-2">
                {!isRecording && !hasRecorded && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                const mediaRecorder = new MediaRecorder(stream, {
                                    mimeType: "audio/webm;codecs=opus",
                                });

                                mediaRecorderRef.current = mediaRecorder;
                                audioChunksRef.current = [];

                                mediaRecorder.ondataavailable = (event) => {
                                    if (event.data.size > 0) {
                                        audioChunksRef.current.push(event.data);
                                    }
                                };

                                mediaRecorder.onstop = () => {
                                    stream.getTracks().forEach((track) => track.stop());
                                };

                                mediaRecorder.start();
                                setIsRecording(true);
                                setRecordingTime(0);
                                setHasRecorded(false);

                                recordingTimerRef.current = setInterval(() => {
                                    setRecordingTime((prev) => prev + 1);
                                }, 1000);
                            } catch (error: any) {
                                toast({
                                    title: "Recording Failed",
                                    description: error.message || "Could not access microphone. Please check permissions.",
                                    variant: "destructive",
                                });
                            }
                        }}
                        data-testid={`button-start-recording-${fieldId}`}
                    >
                        <Mic className="w-4 h-4 mr-2" />
                        Start Recording
                    </Button>
                )}

                {isRecording && (
                    <>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                                    mediaRecorderRef.current.stop();
                                    setIsRecording(false);
                                    setHasRecorded(true);
                                    if (recordingTimerRef.current) {
                                        clearInterval(recordingTimerRef.current);
                                        recordingTimerRef.current = null;
                                    }

                                    if (audioChunksRef.current.length > 0) {
                                        setIsUploadingAudio(true);
                                        try {
                                            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

                                            const uploadFormData = new FormData();
                                            uploadFormData.append("file", audioBlob, "voice-note.webm");

                                            const uploadResponse = await fetch("/api/objects/upload-file", {
                                                method: "POST",
                                                body: uploadFormData,
                                                credentials: "include",
                                            });

                                            if (!uploadResponse.ok) {
                                                throw new Error("Failed to upload audio file");
                                            }

                                            const uploadResult = await uploadResponse.json();
                                            const uploadedAudioUrl = uploadResult.url || uploadResult.objectId;

                                            if (!uploadedAudioUrl) {
                                                throw new Error("No audio URL returned from upload");
                                            }

                                            audioUrlRef.current = uploadedAudioUrl;
                                            setAudioUrl(uploadedAudioUrl);

                                            await onAudioSaved(uploadedAudioUrl);

                                            toast({
                                                title: "Voice Note Saved",
                                                description: "Your voice note has been saved. You can transcribe it later or listen to it.",
                                            });
                                        } catch (error: any) {
                                            console.error("Error uploading audio:", error);
                                            toast({
                                                title: "Upload Failed",
                                                description: "Voice note recorded but not saved. Please try transcribing it to save.",
                                                variant: "destructive",
                                            });
                                        } finally {
                                            setIsUploadingAudio(false);
                                        }
                                    }
                                }
                            }}
                            data-testid={`button-stop-recording-${fieldId}`}
                            disabled={isUploadingAudio}
                        >
                            <Square className="w-4 h-4 mr-2" />
                            {isUploadingAudio
                                ? "Saving..."
                                : `Stop (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, "0")})`}
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm text-muted-foreground">Recording...</span>
                        </div>
                    </>
                )}

                {hasRecorded && !isRecording && (
                    <>
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={async () => {
                                if (audioChunksRef.current.length === 0 && !audioUrl) {
                                    toast({
                                        title: "No Recording",
                                        description: "Please record audio first.",
                                        variant: "destructive",
                                    });
                                    return;
                                }

                                setIsTranscribing(true);
                                try {
                                    let audioBlob: Blob;

                                    if (audioChunksRef.current.length > 0) {
                                        audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

                                        if (!audioUrl) {
                                            setIsUploadingAudio(true);
                                            const uploadFormData = new FormData();
                                            uploadFormData.append("file", audioBlob, "voice-note.webm");

                                            const uploadResponse = await fetch("/api/objects/upload-file", {
                                                method: "POST",
                                                body: uploadFormData,
                                                credentials: "include",
                                            });

                                            if (!uploadResponse.ok) {
                                                throw new Error("Failed to upload audio file");
                                            }

                                            const uploadResult = await uploadResponse.json();
                                            const uploadedAudioUrl = uploadResult.url || uploadResult.objectId;

                                            if (!uploadedAudioUrl) {
                                                throw new Error("No audio URL returned from upload");
                                            }

                                            audioUrlRef.current = uploadedAudioUrl;
                                            setAudioUrl(uploadedAudioUrl);

                                            await onAudioSaved(uploadedAudioUrl);
                                            setIsUploadingAudio(false);
                                        }
                                    } else if (audioUrl) {
                                        const response = await fetch(audioUrl);
                                        audioBlob = await response.blob();
                                    } else {
                                        throw new Error("No audio available for transcription");
                                    }

                                    const transcribeFormData = new FormData();
                                    transcribeFormData.append("audio", audioBlob, "recording.webm");

                                    const transcribeResponse = await fetch("/api/audio/transcribe", {
                                        method: "POST",
                                        body: transcribeFormData,
                                        credentials: "include",
                                    });

                                    if (!transcribeResponse.ok) {
                                        const errorData = await transcribeResponse.json().catch(() => ({ error: transcribeResponse.statusText }));
                                        throw new Error(errorData.error || errorData.message || "Transcription failed");
                                    }

                                    const result = await transcribeResponse.json();

                                    if (result.text) {
                                        await onTranscription(audioUrlRef.current, result.text);

                                        toast({
                                            title: "Transcription Complete",
                                            description: "Voice recording has been converted to text and added to notes.",
                                        });

                                        setHasRecorded(false);
                                        audioChunksRef.current = [];
                                    } else {
                                        throw new Error("No transcription text received");
                                    }
                                } catch (error: any) {
                                    console.error("Transcription error:", error);
                                    toast({
                                        title: "Transcription Failed",
                                        description: error.message || "Failed to transcribe audio. Please try again.",
                                        variant: "destructive",
                                    });
                                } finally {
                                    setIsTranscribing(false);
                                    setIsUploadingAudio(false);
                                }
                            }}
                            disabled={isTranscribing}
                            data-testid={`button-transcribe-${fieldId}`}
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {isUploadingAudio ? "Uploading..." : "Transcribing..."}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Convert to Text
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                setHasRecorded(false);
                                audioChunksRef.current = [];
                                setRecordingTime(0);
                                if (audioUrlRef.current) {
                                    audioUrlRef.current = null;
                                    setAudioUrl(null);
                                    await onTranscription(null, null); // passing null to clear audioUrl
                                }
                            }}
                            data-testid={`button-cancel-recording-${fieldId}`}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                    </>
                )}

                {audioUrl && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (audioPlayerRef.current) {
                                    if (isPlayingAudio) {
                                        audioPlayerRef.current.pause();
                                        setIsPlayingAudio(false);
                                    } else {
                                        audioPlayerRef.current.play();
                                        setIsPlayingAudio(true);
                                    }
                                } else {
                                    const audio = new Audio(audioUrl);
                                    audioPlayerRef.current = audio;
                                    audio.onended = () => {
                                        setIsPlayingAudio(false);
                                        audioPlayerRef.current = null;
                                    };
                                    audio.onerror = () => {
                                        toast({
                                            title: "Playback Failed",
                                            description: "Could not play audio. The file may be unavailable.",
                                            variant: "destructive",
                                        });
                                        setIsPlayingAudio(false);
                                        audioPlayerRef.current = null;
                                    };
                                    audio.play();
                                    setIsPlayingAudio(true);
                                }
                            }}
                        >
                            {isPlayingAudio ? (
                                <>
                                    <Square className="w-4 h-4 mr-2" />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Play Voice Note
                                </>
                            )}
                        </Button>
                        <audio ref={audioPlayerRef} src={audioUrl} style={{ display: "none" }} />
                    </div>
                )}
            </div>
        </div>
    );
}
