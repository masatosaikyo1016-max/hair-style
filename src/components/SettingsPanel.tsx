import { cn } from "@/lib/utils";
import { Settings, MapPin, Sun, Camera, Eye, EyeOff, LayoutTemplate, Check } from "lucide-react";
import { ReactNode } from "react";

export interface SettingsState {
    scene: string;
    lighting: string;
    shotType: string;
    lookAtCamera: boolean;
    aspectRatio: string;
    aspect: string; // Keep for backward compatibility or internal logic
    hairStyle: string;
    hairColor: string;
}

interface SettingsPanelProps {
    settings: SettingsState;
    onSettingChange: (key: keyof SettingsState, value: any) => void;
}

const HAIR_STYLES = [
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

const SCENES = [
    { id: 'Simple Studio', label: 'シンプルスタジオ' },
    { id: 'Urban Street', label: '街並み' },
    { id: 'Nature Forest', label: '自然豊かな森' },
    { id: 'Luxury Hotel', label: '高級ホテル' },
    { id: 'Cafe Interior', label: 'カフェインテリア' },
];

const LIGHTINGS = [
    { id: 'Natural Light', label: '自然光' },
    { id: 'Golden Hour', label: '夕焼け' },
    { id: 'Studio Lighting', label: 'スタジオライティング' },
    { id: 'Night', label: 'ナイト' },
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
    const { scene, lighting, shotType, lookAtCamera, aspectRatio } = settings;

    return (
        <div className="h-full flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 pb-4 border-b border-border">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-bold tracking-tight">生成設定</h2>
            </div>

            <OptionSection label="ヘアカラー (髪色)" icon={<Settings className="w-4 h-4" />}>
                <div className="grid grid-cols-3 gap-2">
                    {HAIR_COLORS.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => onSettingChange('hairColor', color.id)}
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
                    {HAIR_STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => onSettingChange('hairStyle', style.id)}
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

            <OptionSection label="シチュエーション (場所)" icon={<MapPin className="w-4 h-4" />}>

                <div className="grid grid-cols-1 gap-2">
                    {SCENES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => onSettingChange('scene', s.id)}
                            className={cn(
                                "w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between group",
                                scene === s.id
                                    ? "bg-foreground text-background border-foreground shadow-md"
                                    : "bg-muted/50 border-transparent hover:bg-muted hover:border-border"
                            )}
                        >
                            <span className="font-medium text-sm">{s.label}</span>
                            {scene === s.id && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                        </button>
                    ))}
                </div>
            </OptionSection>

            <OptionSection label="ライティング" icon={<Sun className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-2">
                    {LIGHTINGS.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => onSettingChange('lighting', l.id)}
                            className={cn(
                                "px-3 py-2 rounded-lg border text-sm transition-all hover:scale-[1.02]",
                                lighting === l.id
                                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                                    : "border-border hover:bg-muted"
                            )}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </OptionSection>

            <OptionSection label="アングル (画角)" icon={<Camera className="w-4 h-4" />}>
                <div className="flex gap-2">
                    <button
                        onClick={() => onSettingChange('shotType', 'Waist-Up')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-sm text-center hover:bg-muted transition-colors flex items-center justify-center gap-2 group",
                            shotType === 'Waist-Up' ? "border-foreground bg-muted/30" : "border-border"
                        )}
                    >
                        <span>腰から上</span>
                        {shotType === 'Waist-Up' && <Check className="w-3 h-3" />}
                    </button>
                    <button
                        onClick={() => onSettingChange('shotType', 'Full Body')}
                        className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-sm text-center hover:bg-muted transition-colors flex items-center justify-center gap-2 group",
                            shotType === 'Full Body' ? "border-foreground bg-muted/30" : "border-border"
                        )}
                    >
                        <span>全身</span>
                        {shotType === 'Full Body' && <Check className="w-3 h-3" />}
                    </button>
                </div>
            </OptionSection>

            <OptionSection label="詳細設定">
                <button
                    onClick={() => onSettingChange('lookAtCamera', !lookAtCamera)}
                    className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted transition-all"
                >
                    <div className="flex items-center gap-3">
                        {lookAtCamera ? <Eye className="w-4 h-4 text-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        <span className="text-sm font-medium">カメラ目線</span>
                    </div>
                    <div className={cn(
                        "w-10 h-6 rounded-full p-1 transition-colors relative",
                        lookAtCamera ? "bg-foreground" : "bg-muted-foreground/20"
                    )}>
                        <div className={cn(
                            "w-4 h-4 rounded-full bg-background transition-transform",
                            lookAtCamera ? "translate-x-4" : "translate-x-0"
                        )} />
                    </div>
                </button>
            </OptionSection>

            <OptionSection label="ヘアスタイル (髪型)" icon={<Settings className="w-4 h-4" />}>
                <div className="grid grid-cols-2 gap-2">
                    {HAIR_STYLES.map((style) => (
                        <button
                            key={style.id}
                            onClick={() => onSettingChange('hairStyle', style.id)}
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

            {/* Preview Section on Settings Panel */}
            <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-foreground">
                    <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
                    仕上がりイメージ
                </h3>

                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="relative w-full aspect-[3/4] bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            key={`${scene}-${lighting}-${shotType}-${lookAtCamera}`}
                            src={`/previews/${scene}_${lighting}_${shotType}_${lookAtCamera ? 'Camera' : 'Away'}.jpg`}
                            alt="Settings Preview"
                            className="w-full h-full object-contain animate-in fade-in duration-500"
                            onError={(e) => {
                                e.currentTarget.style.opacity = '0';
                            }}
                        />
                    </div>
                    <div className="p-3 bg-muted/30 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground block mb-1">プレビュー画面</span>
                            あなたの選択ですと以上のイメージで生成が行われます。<br />
                            生成結果では、ユーザーの選択したモデル画像を参照して生成されます。ご安心ください。
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
