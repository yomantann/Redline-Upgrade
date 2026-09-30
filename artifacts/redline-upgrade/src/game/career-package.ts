import { getCareer } from './careers';
import type { Player } from './player';

export function swapCareerPackages<T extends Player>(first: T, second: T): [T, T] {
  const firstPackage = {
    careerId: first.careerId,
    salaryTier: first.salaryTier,
    salaryAmount: first.salaryAmount,
    secondCareer: first.secondCareer,
  };
  const secondPackage = {
    careerId: second.careerId,
    salaryTier: second.salaryTier,
    salaryAmount: second.salaryAmount,
    secondCareer: second.secondCareer,
  };
  return [
    { ...first, ...secondPackage },
    { ...second, ...firstPackage },
  ];
}

export function careerAcquisitionTokenCount(careerIds: Array<string | null | undefined>): number {
  return careerIds.reduce((total, careerId) => total + (careerId ? getCareer(careerId)?.acquisitionUpgradeTokens ?? 0 : 0), 0);
}