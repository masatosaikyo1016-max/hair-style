import { cn } from "@/lib/utils";
import { Settings, Palette, Check } from "lucide-react";
import { ReactNode } from "react";

export interface SettingsState {
    hairColor: string;
    aspectRatio: string; // Keep for layout consistency
    aspect: string;
}

interface SettingsPanelProps {
    settings: SettingsState;
    onSettingChange: (key: keyof SettingsState, value: any) => void;
}

const HAIR_COLORS = [
    { id: 'Blonde', label: 'ブロンド', color: '#F0E68C' },
    { id: 'Black', label: 'ブラック', color: '#1a1a1a' },
    { id: 'Brown', label: 'ブラウン', color: '#8B4513' },
    { id: 'Red', label: 'レッド', color: '#800000' },
    { id: 'Silver', label: 'シルバー', color: '#C0C0C0' },
    { id: 'Pink', label: 'ピンク', color: '#FFB6C1' },
    { id: 'Blue', label: 'ブルー', color: '#4169E1' },
    { id: 'Green', label: 'グリーン', color: '#2E8B57' },
];

function OptionSection({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            {children}
        </div>
    );
}

export function SettingsPanel({ settings, onSettingChange }: SettingsPanelProps) {
    const { hairColor } = settings;

    return (
        <div className="h-full flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">スタイル設定</h2>
            </div>

            <OptionSection label="ヘアカラー (髪色)" icon={<Palette className="w-4 h-4" />}>
                <div className="grid grid-cols-1 gap-2"> {/* Use single column like Scenes for better visibility */}
                    {HAIR_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => onSettingChange('hairColor', color.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between group",
                                hairColor === color.id
                                    ? "bg-foreground text-background border-foreground shadow-md"
                                    : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "w-3 h-3 rounded-full shadow-sm",
                                    hairColor === color.id ? "ring-2 ring-background" : ""
                                )} style={{ backgroundColor: color.color }}></span>
                                <span className="font-medium text-sm">{color.label}</span>
                            </div>
                            {hairColor === color.id && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                        </button>
                    ))}
                </div>
            </OptionSection>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground leading-relaxed">
                <p>
                    <span className="font-bold text-blue-400 block mb-1">Tips for Pro</span>
                    自然な仕上がりにするために、元の髪型と光の当たり方を解析して色を適用します。
                </p>
            </div>
        </div>
    );
}

