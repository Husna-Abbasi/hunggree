"use client";

import { Button, Progress, cn } from "@heroui/react";
import { Plus, Gift, User, Phone, Clock } from "lucide-react";
import { useState } from "react";

interface LoyaltyCustomerCardProps {
    customer: {
        id: string;
        current_points: number;
        total_points_earned: number;
        updated_at: string;
        google_object_id: string | null;
        profiles: {
            id: string;
            full_name: string | null;
            phone: string | null;
        } | null;
    };
    program: {
        reward_threshold: number;
        reward_description: string;
        points_per_visit: number;
    } | null;
    restaurantId: string;
    onPointsUpdated: () => void;
}

export default function LoyaltyCustomerCard({
    customer,
    program,
    restaurantId,
    onPointsUpdated
}: LoyaltyCustomerCardProps) {
    const [isAddingPoints, setIsAddingPoints] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);

    const threshold = program?.reward_threshold || 10;
    const pointsPerVisit = program?.points_per_visit || 1;
    const rewardReady = customer.current_points >= threshold;
    const progress = Math.min((customer.current_points / threshold) * 100, 100);

    const handleAddPoints = async () => {
        setIsAddingPoints(true);
        try {
            const res = await fetch('/api/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: customer.id,
                    restaurantId,
                    pointsToAdd: pointsPerVisit
                })
            });
            if (!res.ok) throw new Error('Failed to add points');
            onPointsUpdated();
        } catch (error) {
            console.error(error);
            alert('Failed to add points');
        } finally {
            setIsAddingPoints(false);
        }
    };

    const handleRedeem = async () => {
        if (!confirm(`Redeem reward: "${program?.reward_description || 'Free Item'}"?\n\nThis will reset the customer's points to 0.`)) {
            return;
        }
        setIsRedeeming(true);
        try {
            const res = await fetch(`/api/loyalty/points?cardId=${customer.id}&restaurantId=${restaurantId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to redeem');
            onPointsUpdated();
        } catch (error) {
            console.error(error);
            alert('Failed to redeem reward');
        } finally {
            setIsRedeeming(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className={cn(
            "bg-zinc-900 rounded-2xl border p-5 transition-all",
            rewardReady ? "border-primary shadow-lg shadow-primary/10" : "border-white/10"
        )}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gray-400">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">
                            {customer.profiles?.full_name || 'Anonymous User'}
                        </h3>
                        {customer.profiles?.phone && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone size={10} /> {customer.profiles.phone}
                            </p>
                        )}
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                            Member: {customer.google_object_id
                                ? customer.google_object_id.split('-user-')[1]?.slice(0, 8) || customer.google_object_id.slice(-8)
                                : customer.id.slice(0, 8)}...
                        </p>
                    </div>
                </div>
                {rewardReady && (
                    <div className="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                        <Gift size={10} /> Reward Ready
                    </div>
                )}
            </div>

            {/* Points Progress */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-black text-white">
                        {customer.current_points} <span className="text-sm font-normal text-gray-500">/ {threshold} pts</span>
                    </span>
                    <span className="text-xs text-gray-500">
                        Total earned: {customer.total_points_earned}
                    </span>
                </div>
                <Progress
                    value={progress}
                    size="sm"
                    classNames={{
                        base: "h-2",
                        track: "bg-zinc-800",
                        indicator: rewardReady ? "bg-primary" : "bg-gradient-to-r from-blue-500 to-primary"
                    }}
                />
            </div>

            {/* Last Activity */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                <Clock size={12} />
                <span>Last activity: {formatDate(customer.updated_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="flex-1 bg-zinc-800 text-white font-bold"
                    startContent={<Plus size={14} />}
                    onPress={handleAddPoints}
                    isLoading={isAddingPoints}
                    isDisabled={rewardReady}
                >
                    +{pointsPerVisit} Point{pointsPerVisit > 1 ? 's' : ''}
                </Button>
                <Button
                    size="sm"
                    className={cn(
                        "flex-1 font-bold",
                        rewardReady
                            ? "bg-primary text-black"
                            : "bg-zinc-800 text-gray-500"
                    )}
                    startContent={<Gift size={14} />}
                    onPress={handleRedeem}
                    isLoading={isRedeeming}
                    isDisabled={!rewardReady}
                >
                    Redeem
                </Button>
            </div>
        </div>
    );
}
