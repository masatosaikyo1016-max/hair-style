import { cn } from "@/lib/utils";
import { Settings, MapPin, Sun, Camera, Eye, EyeOff, LayoutTemplate, Check } from "lucide-react";
import { ReactNode } from "react";

export interface SettingsState {
    gender: 'female' | 'male';
    hairStyle: string | null;
    hairColor: string | null;
}

interface SettingsPanelProps {
    settings: SettingsState;
    onSettingChange: (key: keyof SettingsState, value: any) => void;
}

const HAIR_STYLES_FEMALE = [
    { id: 'Very Short', label: 'ベリーショート' },
    { id: 'Short', label: 'ショート' },
    { id: 'Short Bob', label: 'ショートボブ' },
    { id: 'Medium', label: 'ミディアム' },
    { id: 'Semi-Long', label: 'セミロング' },
    { id: 'Long', label: 'ロング' },
    { id: 'Ponytail', label: 'ポニーテール' },
    { id: 'Half Up', label: 'ハーフアップ' },
    { id: 'Bun Hair', label: 'お団子' },
    { id: 'Twin Tail', label: 'ツインテール' },
    { id: 'Three-strand Braid', label: '三つ編み' },
];

const HAIR_STYLES_MALE = [
    { id: 'Buzz Cut', label: '坊主' },
    { id: 'Two Block', label: 'ツーブロック' },
    { id: 'Mash', label: 'マッシュ' },
    { id: 'Center Part', label: 'センターパート' },
    { id: 'Wolf', label: 'ウルフ' },
    { id: 'Dreadlocks', label: 'ドレッド' },
    { id: 'Braids', label: 'ブレイズ' },
    { id: 'Spiky Short', label: 'スパイキーショート' },
];

const HAIR_COLORS = [
    { id: 'Black', label: 'ブラック', color: '#1a1a1a' },
    { id: 'Dark Brown', label: 'ダークブラウン', color: '#3d2b1f' },
    { id: 'Brown', label: 'ブラウン', color: '#654321' },
    { id: 'Light Brown', label: 'ライトブラウン', color: '#8d6e63' },
    { id: 'Blonde', label: 'ブロンド', color: '#e6c27b' },
    { id: 'Red', label: 'レッド', color: '#8d1d1d' },
    { id: 'Silver', label: 'シルバー', color: '#c0c0c0' },
    { id: 'Blue', label: 'ブルー', color: '#1e3a8a' },
    { id: 'Pink', label: 'ピンク', color: '#f472b6' },
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
    const currentHairStyles = settings.gender === 'male' ? HAIR_STYLES_MALE : HAIR_STYLES_FEMALE;

    // Toggle logic: If already selected, deselect (set to null)
    const handleToggle = (key: keyof SettingsState, value: string) => {
        if (settings[key] === value) {
            onSettingChange(key, null);
        } else {
            onSettingChange(key, value);
        }
    };

    return (
        <div className="h-full flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">生成設定</h2>
            </div>

            <OptionSection label="モデルの性別" icon={<Settings className="w-4 h-4" />}>
                <div className="flex bg-muted p-1 rounded-xl">
                    <button
                        onClick={() => onSettingChange('gender', 'female')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            settings.gender === 'female'
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        女性 (Female)
                    </button>
                    <button
                        onClick={() => onSettingChange('gender', 'male')}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            settings.gender === 'male'
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        男性 (Male)
                    </button>
                </div>
            </OptionSection>

            <OptionSection label="ヘアカラー (髪色)" icon={<Settings className="w-4 h-4" />}>
                <div className="grid grid-cols-3 gap-2">
                    {HAIR_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => handleToggle('hairColor', color.id)}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all hover:scale-[1.02]",
                                settings.hairColor === color.id
                                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-sm"
                                    : "border-border hover:bg-muted"
                            )}
                        >
                            <div
                                className="w-6 h-6 rounded-full border border-white/10 shadow-sm"
                                style={{ backgroundColor: color.color }}
                            />
                            <span className="truncate w-full text-center">{color.label}</span>
                        </button>
                    ))}
                </div>
            </OptionSection>

            <OptionSection label="ヘアスタイル (髪型)" icon={<Settings className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-2">
                    {currentHairStyles.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => handleToggle('hairStyle', style.id)}
                            className={cn(
                                "px-3 py-2 rounded-lg border text-sm transition-all hover:scale-[1.02]",
                                settings.hairStyle === style.id
                                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                    : "border-border hover:bg-muted"
                            )}
                        >
                            {style.label}
                        </button>
                    ))}
                </div>
            </OptionSection>
        </div>
    );
}
