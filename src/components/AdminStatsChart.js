import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AdminStatsChart({ trainees, trainers }) {
    const data = {
        labels: ['Trainees', 'Trainers'],
        datasets: [
            {
                label: '# of Users',
                data: [trainees, trainers],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.5)', // Blue for Trainees
                    'rgba(168, 85, 247, 0.5)', // Purple for Trainers
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        }
    };

    return (
        <div className="w-full max-w-xs mx-auto">
            <Doughnut data={data} options={options} />
        </div>
    );
}
