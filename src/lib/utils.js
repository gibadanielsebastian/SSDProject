export const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
        case 'Advanced':
        case 'Pro':
            return 'bg-red-500/10 text-red-400 border border-red-500/20';
        case 'Intermediate':
            return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
        case 'Beginner':
        default:
            return 'bg-green-500/10 text-green-400 border border-green-500/20';
    }
};
