declare module "fluent-ffmpeg" {
  interface FfmpegCommand {
    noVideo(): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(rate: number): FfmpegCommand;
    format(fmt: string): FfmpegCommand;
    save(path: string): FfmpegCommand;
    on(event: string, cb: (...args: any[]) => void): FfmpegCommand;
  }
  function ffmpeg(input?: string): FfmpegCommand;
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
  }
  export = ffmpeg;
}
