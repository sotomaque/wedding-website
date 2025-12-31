"use client";

import type { MapViewState } from "@deck.gl/core";
import { CollisionFilterExtension } from "@deck.gl/extensions";
import { IconLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { useEffect, useMemo, useState } from "react";
import MapGL from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/env";
import { HEADQUARTERS, IMMACULATA, LOCATIONS } from "./constants";

// Helper function to create emoji icon as data URL
function createEmojiIcon(emoji: string, size = 64): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.font = `${size * 0.75}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, size / 2, size / 2);

  return canvas.toDataURL();
}

interface SanDiegoMapProps {
  activeLocation?: string;
  onLocationClick?: (locationId: string) => void;
}

export function SanDiegoMap({
  activeLocation,
  onLocationClick,
}: SanDiegoMapProps) {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: -117.1936,
    latitude: 32.7405,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  });

  // Generate emoji icons as data URLs (only on client side)
  const [emojiIconMapping, setEmojiIconMapping] = useState<
    Record<string, { url: string; width: number; height: number }>
  >({});

  useEffect(() => {
    // Generate emoji icons only on client side where document is available
    const mapping: Record<
      string,
      { url: string; width: number; height: number }
    > = {};

    // Location emojis
    for (const location of LOCATIONS) {
      mapping[location.emoji] = {
        url: createEmojiIcon(location.emoji, 64),
        width: 64,
        height: 64,
      };
    }

    // Venue emojis
    mapping[IMMACULATA.emoji] = {
      url: createEmojiIcon(IMMACULATA.emoji, 64),
      width: 64,
      height: 64,
    };
    mapping[HEADQUARTERS.emoji] = {
      url: createEmojiIcon(HEADQUARTERS.emoji, 64),
      width: 64,
      height: 64,
    };

    setEmojiIconMapping(mapping);
  }, []);

  // Create stable collision filter extension instance
  const collisionFilterExtension = useMemo(
    () => new CollisionFilterExtension(),
    []
  );

  // Update view when active location changes
  useEffect(() => {
    if (activeLocation) {
      const location = LOCATIONS.find((loc) => loc.id === activeLocation);
      if (location) {
        setViewState((prev) => ({
          ...prev,
          longitude: location.coordinates[0],
          latitude: location.coordinates[1],
          zoom: 13,
          transitionDuration: 1000,
        }));
      }
    } else {
      // Reset to overview
      setViewState((prev) => ({
        ...prev,
        longitude: -117.1936,
        latitude: 32.7405,
        zoom: 11,
        transitionDuration: 1000,
      }));
    }
  }, [activeLocation]);

  const layers = [
    // Location circles (rendered before venues so venues appear on top)
    new ScatterplotLayer({
      id: "location-circles",
      data: LOCATIONS,
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => {
        const color = d.color;
        // Reduce opacity to 50% (127 out of 255)
        return [color[0], color[1], color[2], 127];
      },
      getRadius: (d) => (d.id === activeLocation ? 250 : 200),
      radiusMinPixels: 20,
      radiusMaxPixels: 35,
      pickable: true,
      onClick: (info) => {
        if (info.object && onLocationClick) {
          onLocationClick(info.object.id);
        }
      },
      transitions: {
        getRadius: 300,
      },
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: (d: { id: string | undefined }) =>
        d.id === activeLocation ? 1 : 0,
    }),

    // Location emojis
    new IconLayer({
      id: "location-emojis",
      data: LOCATIONS,
      getPosition: (d) => d.coordinates,
      getIcon: (d) => ({
        url: emojiIconMapping[d.emoji]?.url || "",
        width: 64,
        height: 64,
      }),
      getSize: (d) => (d.id === activeLocation ? 32 : 28),
      sizeUnits: "pixels",
      pickable: true,
      onClick: (info) => {
        if (info.object && onLocationClick) {
          onLocationClick(info.object.id);
        }
      },
      transitions: {
        getSize: 300,
      },
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: (d: { id: string | undefined }) =>
        d.id === activeLocation ? 1 : 0,
    }),

    // Venue circles
    new ScatterplotLayer({
      id: "venue-circles",
      data: [IMMACULATA, HEADQUARTERS],
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => {
        const color = d.color;
        // Reduce opacity to 50% (127 out of 255)
        return [color[0], color[1], color[2], 127];
      },
      getRadius: 250,
      radiusMinPixels: 22,
      radiusMaxPixels: 40,
      pickable: true,
      onClick: () => {
        // Venues are not selectable, they're just markers
        // Only location markers should trigger selection
      },
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: 2, // Higher priority than locations
    }),

    // Venue emojis
    new IconLayer({
      id: "venue-emojis",
      data: [IMMACULATA, HEADQUARTERS],
      getPosition: (d) => d.coordinates,
      getIcon: (d) => ({
        url: emojiIconMapping[d.emoji]?.url || "",
        width: 64,
        height: 64,
      }),
      getSize: 32,
      sizeUnits: "pixels",
      pickable: true,
      onClick: () => {
        // Venues are not selectable, they're just markers
      },
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: 2, // Higher priority than locations
    }),

    // Venue labels
    new TextLayer({
      id: "venue-labels",
      data: [IMMACULATA, HEADQUARTERS],
      getPosition: (d) => d.coordinates,
      getText: (d) => d.name,
      getSize: 12,
      getColor: (d) => d.color,
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "top",
      getPixelOffset: [0, 25],
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: 600,
      background: true,
      getBackgroundColor: [255, 255, 255, 200],
      backgroundPadding: [4, 2],
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: 2, // Higher priority than locations
    }),

    // Location labels
    new TextLayer({
      id: "location-labels",
      data: LOCATIONS,
      getPosition: (d) => d.coordinates,
      getText: (d) => d.name,
      getSize: (d) => (d.id === activeLocation ? 13 : 11),
      getColor: (d) => (d.id === activeLocation ? d.color : [64, 64, 64, 255]),
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "top",
      getPixelOffset: [0, 10],
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: 600,
      background: true,
      getBackgroundColor: [255, 255, 255, 220],
      backgroundPadding: [4, 2],
      transitions: {
        getSize: 300,
        getColor: 300,
      },
      extensions: [collisionFilterExtension],
      collisionEnabled: true,
      getCollisionPriority: (d: { id: string | undefined }) =>
        d.id === activeLocation ? 1 : 0,
    }),
  ];

  return (
    <div className="w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: newViewState }) =>
          setViewState(newViewState as MapViewState)
        }
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
      >
        <MapGL
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_TOKEN}
        />
      </DeckGL>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-md border border-neutral-200 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h4 className="font-semibold text-sm mb-3 text-neutral-900">Legend</h4>
        <div className="space-y-3">
          {/* Venues Section */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-neutral-700 mb-1">
              Wedding Venues
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{
                  backgroundColor: `rgba(${IMMACULATA.color[0]}, ${IMMACULATA.color[1]}, ${IMMACULATA.color[2]}, ${IMMACULATA.color[3] / 255})`,
                }}
              >
                {IMMACULATA.emoji}
              </div>
              <span className="text-xs text-neutral-700">
                {IMMACULATA.name} (Ceremony)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{
                  backgroundColor: `rgba(${HEADQUARTERS.color[0]}, ${HEADQUARTERS.color[1]}, ${HEADQUARTERS.color[2]}, ${HEADQUARTERS.color[3] / 255})`,
                }}
              >
                {HEADQUARTERS.emoji}
              </div>
              <span className="text-xs text-neutral-700">
                {HEADQUARTERS.name} (Reception)
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200" />

          {/* Things to Do Section */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-neutral-700 mb-1">
              Things to Do
            </p>
            {LOCATIONS.map((location) => (
              <button
                type="button"
                key={location.id}
                onClick={() => onLocationClick?.(location.id)}
                className="flex items-center gap-2 w-full hover:bg-neutral-50 rounded px-1 py-0.5 transition-colors cursor-pointer"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                  style={{
                    backgroundColor: `rgba(${location.color[0]}, ${location.color[1]}, ${location.color[2]}, ${location.id === activeLocation ? 1 : 0.7})`,
                  }}
                >
                  {location.emoji}
                </div>
                <span
                  className={`text-xs ${
                    location.id === activeLocation
                      ? "font-semibold"
                      : "text-neutral-700"
                  }`}
                  style={
                    location.id === activeLocation
                      ? {
                          color: `rgb(${location.color[0]}, ${location.color[1]}, ${location.color[2]})`,
                        }
                      : undefined
                  }
                >
                  {location.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
