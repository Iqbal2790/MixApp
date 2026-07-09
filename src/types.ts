export interface Song {
  id: string; // unique internal ID for the queue item
  videoId: string; // youtube video ID
  title: string;
  thumbnail: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}
