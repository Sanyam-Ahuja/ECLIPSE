"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { CampuGridAPI } from "@/lib/api";
import { Trophy, Flame, Star } from "lucide-react";
import clsx from "clsx";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const api = new CampuGridAPI(session?.backend_jwt || "");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", session?.backend_jwt],
    queryFn: () => api.getLeaderboard("month", 25),
    enabled: !!session?.backend_jwt,
    refetchInterval: 30000,
  });

  const leaderboard = data?.leaderboard || [];
  const yourRank = data?.your_rank;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="pb-8 border-b border-border">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Trophy className="text-yellow-400" /> Campus Leaderboard
        </h1>
        <p className="text-text-muted mt-2 text-lg">
          See how your contributions stack up against other nodes on the grid.
        </p>
      </header>

      {/* Your Rank Card */}
      {yourRank && (
        <div className="glass rounded-2xl p-6 border border-primary/20 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm font-medium">Your Rank</p>
            <p className="text-4xl font-bold text-primary">#{yourRank}</p>
          </div>
          <div className="text-right">
            <p className="text-text-muted text-sm">Keep contributing to climb!</p>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-border">
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider w-16">Rank</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Node</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Tier</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">GPU Hours</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Reliability</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider">Streak</th>
                <th className="px-6 py-4 font-medium text-text-muted text-sm uppercase tracking-wider text-right">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No contributors yet. Be the first!
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry: any) => (
                  <tr
                    key={entry.node_id}
                    className={clsx(
                      "transition-colors",
                      entry.is_you
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-white/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "text-lg font-bold",
                        entry.rank === 1 ? "text-yellow-400" :
                        entry.rank === 2 ? "text-gray-300" :
                        entry.rank === 3 ? "text-amber-600" :
                        "text-text-muted"
                      )}>
                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {entry.hostname}
                            {entry.is_you && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">You</span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted">{entry.gpu_model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span>{entry.tier_icon}</span>
                        <span className="font-medium text-white">{entry.tier_name}</span>
                        <span className="text-xs text-text-muted">Lv.{entry.tier_level}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">
                      {entry.total_gpu_hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={clsx(
                              star <= Math.round(entry.reliability_score * 5)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-white/20"
                            )}
                          />
                        ))}
                        <span className="text-xs text-text-muted ml-1">{entry.reliability_score.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-1 text-sm text-orange-400">
                          <Flame size={14} /> {entry.current_streak}d
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-success">
                      ${entry.total_earned.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
