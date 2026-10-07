'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Flame, CheckCircle2, Settings2, Plus, Clock, Footprints } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  avatar: string;
  weightKg: number;
  gender: 'women' | 'men';
  age: number;
}

const DEFAULT_PROFILES: Profile[] = [
  { id: 'wife', name: 'Wife', avatar: '👩', weightKg: 71, gender: 'women', age: 32 },
  { id: 'me', name: 'Me', avatar: '👨', weightKg: 78, gender: 'men', age: 34 },
];

export default function DualTrackerApp() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>('wife');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Walk inputs
  const [steps, setSteps] = useState<number>(6000);
  const [distanceKm, setDistanceKm] = useState<number>(4.0);
  const [durationMin, setDurationMin] = useState<number>(45);

  // History & feedback state
  const [walks, setWalks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load profiles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('household_profiles');
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    fetchWalks();
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  function updateActiveProfile(updates: Partial<Profile>) {
    const updated = profiles.map((p) => (p.id === activeProfile.id ? { ...p, ...updates } : p));
    setProfiles(updated);
    localStorage.setItem('household_profiles', JSON.stringify(updated));
  }

  // ACSM Standard MET table
  function calculateMET(mph: number) {
    if (mph <= 0) return 1.0;
    if (mph < 2.0) return 2.0;
    if (mph < 2.5) return 2.8 + (mph - 2.0) * ((3.0 - 2.8) / 0.5);
    if (mph < 3.0) return 3.0 + (mph - 2.5) * ((3.5 - 3.0) / 0.5);
    if (mph < 3.5) return 3.5 + (mph - 3.0) * ((4.3 - 3.5) / 0.5);
    if (mph < 4.0) return 4.3 + (mph - 3.5) * ((5.0 - 4.3) / 0.5);
    if (mph < 4.5) return 5.0 + (mph - 4.0) * ((7.0 - 5.0) / 0.5);
    if (mph < 5.0) return 7.0 + (mph - 4.5) * ((8.3 - 7.0) / 0.5);
    return 8.3 + (mph - 5.0) * 1.5;
  }

  // Calculations
  const durationHours = durationMin > 0 ? durationMin / 60 : 0;
  const speedKmh = durationHours > 0 && distanceKm > 0 ? distanceKm / durationHours : 0;
  const speedMph = speedKmh * 0.621371;
  const paceMinPerKm = distanceKm > 0 ? durationMin / distanceKm : 0;
  const cadence = durationMin > 0 ? Math.round(steps / durationMin) : 0;
  const met = calculateMET(speedMph);

  const grossCalories = Math.round(met * activeProfile.weightKg * durationHours);
  const netCalories = Math.round((met - 1) * activeProfile.weightKg * durationHours);
  const restingCalories = Math.max(0, grossCalories - netCalories);

  const paceMinutes = Math.floor(paceMinPerKm);
  const paceSeconds = Math.round((paceMinPerKm - paceMinutes) * 60);
  const paceStr = distanceKm > 0 ? `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}` : '--:--';

  // Supabase Fetch
  async function fetchWalks() {
    try {
      const { data, error } = await supabase
        .from('walks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setWalks(data);
      }
    } catch (err) {
      console.warn('Fetch error:', err);
    }
  }

  // One-click Cloud Save
  async function saveWalk() {
    setSaving(true);
    const newRecord = {
      profile_name: activeProfile.name,
      steps,
      distance_km: distanceKm,
      duration_min: durationMin,
      weight_kg: activeProfile.weightKg,
      gross_calories: grossCalories,
      net_calories: netCalories,
      pace: `${paceStr} /km`,
      speed_kmh: parseFloat(speedKmh.toFixed(1)),
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('walks').insert([newRecord]);
      if (!error) {
        setSavedSuccess(true);
        fetchWalks();
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      
      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Footprints className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">Walk<span className="text-emerald-600">Cal</span></span>
          </div>

          {/* Frictionless 1-Click Profile Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProfileId(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="text-sm">{p.avatar}</span>
                  <span>{p.name}</span>
                  <span className={`text-[10px] font-normal ${isActive ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    {p.weightKg}kg
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
              title="Edit Profile Weight"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile Specs Quick Editor Drawer */}
      {isEditingProfile && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeProfile.avatar}</span>
              <span className="text-sm font-bold text-slate-900">Editing {activeProfile.name}'s Profile:</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Weight:</label>
                <input
                  type="number"
                  value={activeProfile.weightKg}
                  onChange={(e) => updateActiveProfile({ weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400">kg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Age:</label>
                <input
                  type="number"
                  value={activeProfile.age}
                  onChange={(e) => updateActiveProfile({ age: parseInt(e.target.value) || 0 })}
                  className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Quick Input Panel */}
          <section className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">Log Walk for {activeProfile.name}</h2>
                <p className="text-xs text-slate-400">Calculates instantly using {activeProfile.weightKg} kg baseline</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">Live</span>
            </div>

            <div className="space-y-4">
              <!-- Steps -->
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Steps</label>
                <div className="relative">
                  <input
                    type="number"
                    value={steps}
                    onChange={(e) => {
                      const st = parseInt(e.target.value) || 0;
                      setSteps(st);
                      setDistanceKm(parseFloat((st * 0.00067).toFixed(1)));
                    }}
                    className="w-full bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border border-slate-200 focus:border-emerald-500 px-4 py-3 outline-none"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">STEPS</span>
                </div>
                {/* 1-Tap Chips */}
                <div className="flex gap-2 mt-2">
                  {[3000, 5000, 6000, 8000, 10000].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSteps(num);
                        setDistanceKm(parseFloat((num * 0.00067).toFixed(1)));
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      {num / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const n = steps + 500;
                      setSteps(n);
                      setDistanceKm(parseFloat((n * 0.00067).toFixed(1)));
                    }}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors ml-auto"
                  >
                    +500
                  </button>
                </div>
              </div>

              {/* Distance and Duration in Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Distance</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={distanceKm}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value) || 0;
                        setDistanceKm(d);
                        setSteps(Math.round(d / 0.00067));
                      }}
                      className="w-full bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border border-slate-200 focus:border-emerald-500 px-4 py-3 outline-none"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">KM</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Duration</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={durationMin}
                      onChange={(e) => setDurationMin(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 text-slate-900 text-lg font-bold rounded-2xl border border-slate-200 focus:border-emerald-500 px-4 py-3 outline-none"
                    />
                    <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">MIN</span>
                  </div>
                </div>
              </div>

              {/* Quick Duration Buttons */}
              <div className="flex gap-2 items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick:</span>
                {[20, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMin(m)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    {m}m
                  </button>
                ))}
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={saveWalk}
                disabled={saving}
                className={`w-full mt-2 py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Saved for {activeProfile.name}!</span>
                  </>
                ) : (
                  <span>{saving ? 'Syncing...' : `Save Walk for ${activeProfile.name}`}</span>
                )}
              </button>
            </div>
          </section>

          {/* RIGHT: Live Calories & History */}
          <section className="lg:col-span-6 space-y-6">
            
            {/* HERO STAT CARD */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {speedKmh < 4 ? 'Leisurely Pace' : speedKmh <= 5.8 ? 'Brisk Pace' : 'Power Walk'}
                </span>
                <span className="text-xs font-semibold text-slate-400">Active Profile: {activeProfile.name}</span>
              </div>

              {/* Hero Metric: Net Active */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                    Net Active Calories (Exercise Only)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-slate-900 tracking-tight">{netCalories}</span>
                    <span className="text-xl font-bold text-emerald-600">kcal</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Deficit toward daily food intake</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Gross Burn</span>
                  <div className="text-lg font-bold text-slate-700">{grossCalories} kcal</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Incl. {restingCalories} kcal resting</span>
                </div>
              </div>

              {/* Micro Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Pace</span>
                  <p className="text-sm font-bold text-slate-900">{paceStr} /km</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Speed</span>
                  <p className="text-sm font-bold text-slate-900">{speedKmh.toFixed(1)} km/h</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Cadence</span>
                  <p className="text-sm font-bold text-slate-900">{cadence} spm</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">MET</span>
                  <p className="text-sm font-bold text-slate-900">{met.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Household Walk History */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Recent Walk History</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {walks.length} logged
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {walks.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">No walks logged yet. Save your first walk above!</p>
                ) : (
                  walks.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{w.profile_name === 'Wife' ? '👩' : '👨'}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {w.distance_km} km <span className="font-normal text-xs text-slate-400">in {w.duration_min}m</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {w.profile_name} · {new Date(w.created_at).toLocaleDateString()} · {w.steps?.toLocaleString()} steps
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600">+{Math.round(w.net_calories)}</span>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Net Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}