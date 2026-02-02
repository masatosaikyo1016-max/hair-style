"use client";

import { UploadZone } from "@/components/UploadZone";
import { SettingsPanel, SettingsState } from "@/components/SettingsPanel";
import { GenerateArea } from "@/components/GenerateArea";
import { useState } from "react";

export default function Home() {
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [garmentImage, setGarmentImage] = useState<File | null>(null);
  const [bottomsImage, setBottomsImage] = useState<File | null>(null);

  const [settings, setSettings] = useState<SettingsState>({
    aspect: "3:4",
    aspectRatio: "3:4",
    hairColor: "Brown",
  });

  const handleSettingChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-background text-foreground p-4 md:p-6 gap-6 md:overflow-hidden md:h-screen">
      {/* Left Sidebar: Controls - Scrollable on mobile naturally, fixed on desktop */}
      <div className="w-full md:w-[400px] flex flex-col gap-6 shrink-0 md:overflow-y-auto pr-2 custom-scrollbar">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
            AI Studio
          </h1>
          <p className="text-sm text-muted-foreground">Virtual Photo Shoot</p>
        </header>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Input Assets</h3>
          <UploadZone
            onModelSelect={setModelImage}
          />
        </section>

        <section className="flex-1">
          <SettingsPanel settings={settings} onSettingChange={handleSettingChange} />
        </section>
      </div>

      {/* Right Area: Preview - Minimum height for mobile */}
      <div className="flex-1 w-full min-h-[500px] md:min-h-0 md:h-full md:overflow-y-auto custom-scrollbar">
        <GenerateArea
          modelImage={modelImage}
          settings={settings}
        />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--muted-foreground);
          border-radius: 4px;
          opacity: 0.5;
        }
      `}</style>
    </main>
  );
}
