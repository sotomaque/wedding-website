"use client";

import type { MapViewState } from "@deck.gl/core";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import { useEffect, useState } from "react";
import MapGL from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { HEADQUARTERS, IMMACULATA, LOCATIONS } from "./constants";

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
    // Location markers (rendered before venues so venues appear on top)
    new ScatterplotLayer({
      id: "locations",
      data: LOCATIONS,
      getPosition: (d) => d.coordinates,
      getFillColor: (d) => {
        if (d.id === activeLocation) {
          // Active: use brighter version of the color
          return d.color;
        }
        // Inactive: use dimmed version of the color
        return [d.color[0], d.color[1], d.color[2], 200];
      },
      getRadius: 200,
      radiusMinPixels: 10,
      radiusMaxPixels: 25,
      pickable: true,
      onClick: (info) => {
        if (info.object && onLocationClick) {
          onLocationClick(info.object.id);
        }
      },
      transitions: {
        getFillColor: 300,
        getRadius: 300,
      },
    }),

    // Venues (ceremony & reception) - rendered on top
    new ScatterplotLayer({
      id: "venues",
      data: [IMMACULATA, HEADQUARTERS],
      getPosition: (d) => d.coordinates,
      getFillColor: (d) =>
        d.type === "ceremony" ? [147, 51, 234, 255] : [59, 130, 246, 255],
      getRadius: 200,
      radiusMinPixels: 10,
      radiusMaxPixels: 25,
      pickable: true,
      onClick: () => {
        // Venues are not selectable, they're just markers
        // Only location markers should trigger selection
      },
    }),

    // Venue labels
    new TextLayer({
      id: "venue-labels",
      data: [IMMACULATA, HEADQUARTERS],
      getPosition: (d) => d.coordinates,
      getText: (d) => d.name,
      getSize: 12,
      getColor: (d) =>
        d.type === "ceremony" ? [147, 51, 234, 255] : [59, 130, 246, 255],
      getAngle: 0,
      getTextAnchor: "middle",
      getAlignmentBaseline: "top",
      getPixelOffset: [0, 12],
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: 600,
      background: true,
      getBackgroundColor: [255, 255, 255, 200],
      backgroundPadding: [4, 2],
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
          mapboxAccessToken={
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
            "pk.eyJ1Ijoic290b21hcXVlIiwiYSI6ImNtanRsZ3o4ZjQyNnAzZXE2anJkaG0wOTIifQ.A4SxeBA4SJvmjkceZx25ZQ"
          }
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
              <div className="w-3 h-3 rounded-full bg-purple-600 flex-shrink-0" />
              <span className="text-xs text-neutral-700">
                The Immaculata (Ceremony)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-xs text-neutral-700">
                Headquarters (Reception)
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
              <div key={location.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: `rgba(${location.color[0]}, ${location.color[1]}, ${location.color[2]}, ${location.id === activeLocation ? 1 : 0.7})`,
                  }}
                />
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
