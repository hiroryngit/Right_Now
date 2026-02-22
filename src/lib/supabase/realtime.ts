import { supabase } from "./client";
import type { Coordinates } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface LocationPayload {
  userId: string;
  coordinates: Coordinates;
  tag: string | null;
}

export function subscribeToLocationBroadcast(
  channelName: string,
  onReceive: (payload: LocationPayload) => void
): RealtimeChannel {
  const channel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: "location" }, ({ payload }) => {
      onReceive(payload as LocationPayload);
    })
    .subscribe();

  return channel;
}

export function broadcastLocation(
  channel: RealtimeChannel,
  payload: LocationPayload
): void {
  channel.send({
    type: "broadcast",
    event: "location",
    payload,
  });
}

export function unsubscribe(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
