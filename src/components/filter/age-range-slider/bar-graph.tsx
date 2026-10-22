import React, { useMemo } from "react";
import { BarItem } from "./bar-item";
import { useBarGraphHeight } from "./hooks/use-bar-graph-height.tsx";

export const calculateBarPercentage = (input: number, maxCount: number) => {
	return `${maxCount === 0 ? 0 : Math.round((input / maxCount) * 100)}%`;
};

export interface BarGraphProps {
	min: number;
	max: number;
	/** Number of trees per age in years; the last bucket means "this age and older". */
	counts: number[];
}

export const BarGraph: React.FC<BarGraphProps> = ({ min, max, counts }) => {
	const maxCount = Math.max(0, ...counts);

	const barItems = useMemo(() => {
		return counts.map((count, age) => ({
			isActive: age >= min && age <= max,
			barPercentage: calculateBarPercentage(count, maxCount),
			id: age,
		}));
	}, [min, max, counts, maxCount]);

	const { height } = useBarGraphHeight();

	return (
		<div className="w-full relative" style={{ height: height }}>
			<div className="flex flex-row gap-0.5 w-full h-full">
				{barItems.map((ageGroup) => (
					<BarItem
						key={ageGroup.id}
						barPercentage={ageGroup.barPercentage}
						isActive={ageGroup.isActive}
					/>
				))}
			</div>
			<div className="flex w-full justify-between pt-4 text-gdk-light-gray font-semibold">
				<span className="">0</span>
				<span>{Math.max(0, counts.length - 1)}+</span>
			</div>
		</div>
	);
};
