import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Settings, Plus } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
const generateCities = (n) => {
    return Array.from({ length: n }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        name: `City ${i + 1}`,
    }));
};
const distance = (a, b) => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};
const totalDistance = (tour, cities) => {
    return tour.reduce((sum, city, i) => {
        const nextCity = tour[(i + 1) % tour.length];
        return sum + distance(cities[city], cities[nextCity]);
    }, 0);
};
// Brute force solver - generates all permutations
const bruteForce = (cities) => {
    const generatePermutations = (arr) => {
        if (arr.length <= 1)
            return [arr];
        const perms = [];
        for (let i = 0; i < arr.length; i++) {
            const current = arr[i];
            const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
            const remainingPerms = generatePermutations(remaining);
            for (const perm of remainingPerms) {
                perms.push([current, ...perm]);
            }
        }
        return perms;
    };
    const indices = Array.from({ length: cities.length }, (_, i) => i);
    const allTours = generatePermutations(indices);
    let bestTour = allTours[0];
    let bestDist = totalDistance(bestTour, cities);
    for (const tour of allTours) {
        const dist = totalDistance(tour, cities);
        if (dist < bestDist) {
            bestDist = dist;
            bestTour = tour;
        }
    }
    return { tour: bestTour, distance: bestDist };
};
// Branch and Bound solver
const branchAndBound = (cities) => {
    const n = cities.length;
    let bestTour = Array.from({ length: n }, (_, i) => i);
    let bestDist = Infinity;
    // Calculate lower bound using nearest neighbor for remaining cities
    const calculateLowerBound = (partial, used) => {
        if (partial.length === n)
            return totalDistance(partial, cities);
        let bound = 0;
        // Add distances in current partial path
        for (let i = 0; i < partial.length - 1; i++) {
            bound += distance(cities[partial[i]], cities[partial[i + 1]]);
        }
        // For each remaining city, add distance to nearest unvisited neighbor
        let current = partial[partial.length - 1];
        let remaining = Array.from({ length: n }, (_, i) => i).filter((i) => !used.has(i));
        while (remaining.length > 0) {
            let nearestDist = Infinity;
            let nearestCity = -1;
            for (const city of remaining) {
                const dist = distance(cities[current], cities[city]);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestCity = city;
                }
            }
            bound += nearestDist;
            current = nearestCity;
            remaining = remaining.filter((c) => c !== nearestCity);
        }
        return bound;
    };
    const solve = (partial, used) => {
        if (partial.length === n) {
            const dist = totalDistance(partial, cities);
            if (dist < bestDist) {
                bestDist = dist;
                bestTour = [...partial];
            }
            return;
        }
        const bound = calculateLowerBound(partial, used);
        if (bound >= bestDist)
            return;
        for (let i = 0; i < n; i++) {
            if (!used.has(i)) {
                used.add(i);
                partial.push(i);
                solve(partial, used);
                partial.pop();
                used.delete(i);
            }
        }
    };
    solve([0], new Set([0]));
    return { tour: bestTour, distance: bestDist };
};
const TSPDemo = () => {
    const [cities, setCities] = useState([]);
    const [tour, setTour] = useState([]);
    const [temperature, setTemperature] = useState(1500);
    const [coolingRate, setCoolingRate] = useState(0.995);
    const [iterations, setIterations] = useState(2000);
    const [currentIteration, setCurrentIteration] = useState(0);
    const [bestDistance, setBestDistance] = useState(Infinity);
    const [bestTour, setBestTour] = useState([]);
    const [distanceHistory, setDistanceHistory] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [cityCount, setCityCount] = useState(10);
    const [animationSpeed, setAnimationSpeed] = useState(500);
    const [showBestPath, setShowBestPath] = useState(true);
    const [selectedSolver, setSelectedSolver] = useState('simulated-annealing');
    const [isCalculating, setIsCalculating] = useState(false);
    // Initialize a new problem
    const createNewProblem = useCallback(() => {
        const newCities = generateCities(cityCount);
        setCities(newCities);
        const initialTour = Array.from({ length: newCities.length }, (_, i) => i);
        setTour(initialTour);
        setBestTour(initialTour);
        setCurrentIteration(0);
        setBestDistance(totalDistance(initialTour, newCities));
        setDistanceHistory([]);
        setIsRunning(false);
        setIsCalculating(false);
    }, [cityCount]);
    // Reset current solution only
    const resetSolution = useCallback(() => {
        const initialTour = Array.from({ length: cities.length }, (_, i) => i);
        setTour(initialTour);
        setBestTour(initialTour);
        setCurrentIteration(0);
        setBestDistance(totalDistance(initialTour, cities));
        setDistanceHistory([]);
        setIsRunning(false);
        setIsCalculating(false);
    }, [cities]);
    useEffect(() => {
        createNewProblem();
    }, [createNewProblem]);
    const simulateSteps = useCallback(() => {
        if (!isRunning || currentIteration >= iterations) {
            setIsRunning(false);
            return;
        }
        // Calculate how many steps to simulate this frame
        const stepsPerFrame = Math.ceil(animationSpeed / 30); // 30fps baseline
        // Batch multiple simulation steps
        const newHistory = [];
        let currentTemp, newTour, currentDist, newDistance, delta;
        let localTour = [...tour];
        let localBestDistance = bestDistance;
        let localBestTour = [...bestTour];
        for (let step = 0; step < stepsPerFrame && currentIteration + step < iterations; step++) {
            currentTemp =
                temperature * Math.pow(coolingRate, currentIteration + step);
            // Create new tour by swapping two cities
            newTour = [...localTour];
            const a = Math.floor(Math.random() * newTour.length);
            const b = Math.floor(Math.random() * newTour.length);
            [newTour[a], newTour[b]] = [newTour[b], newTour[a]];
            currentDist = totalDistance(localTour, cities);
            newDistance = totalDistance(newTour, cities);
            delta = newDistance - currentDist;
            if (delta < 0 || Math.random() < Math.exp(-delta / currentTemp)) {
                localTour = newTour;
                if (newDistance < localBestDistance) {
                    localBestDistance = newDistance;
                    localBestTour = [...newTour];
                }
            }
            newHistory.push({
                iteration: currentIteration + step,
                currentDistance: currentDist,
                bestDistance: localBestDistance,
                temperature: currentTemp,
            });
        }
        // Update state once for all steps
        setTour(localTour);
        setBestTour(localBestTour);
        setBestDistance(localBestDistance);
        setDistanceHistory((prev) => [...prev, ...newHistory]);
        setCurrentIteration((prev) => prev + stepsPerFrame);
    }, [
        isRunning,
        currentIteration,
        iterations,
        temperature,
        coolingRate,
        tour,
        cities,
        bestDistance,
        bestTour,
        animationSpeed,
    ]);
    useEffect(() => {
        const interval = setInterval(() => {
            if (isRunning) {
                simulateSteps();
            }
        }, 1000 / 30); // Fixed 30fps for smooth animation
        return () => clearInterval(interval);
    }, [simulateSteps, isRunning]);
    const solveBruteForce = async () => {
        setIsCalculating(true);
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            const result = bruteForce(cities);
            setTour(result.tour);
            setBestTour(result.tour);
            setBestDistance(result.distance);
            setIsCalculating(false);
        }, 100);
    };
    const solveBranchAndBound = async () => {
        setIsCalculating(true);
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            const result = branchAndBound(cities);
            setTour(result.tour);
            setBestTour(result.tour);
            setBestDistance(result.distance);
            setIsCalculating(false);
        }, 100);
    };
    const drawPath = (pathTour, color, opacity = 1) => {
        return pathTour.map((cityIndex, i) => {
            const nextCityIndex = pathTour[(i + 1) % pathTour.length];
            const city = cities[cityIndex];
            const nextCity = cities[nextCityIndex];
            return (_jsx("line", { x1: city.x, y1: city.y, x2: nextCity.x, y2: nextCity.y, stroke: color, strokeWidth: opacity * 0.5, strokeOpacity: opacity }, `${color}-${i}`));
        });
    };
    return (_jsxs("div", { className: "p-4 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold", children: "Traveling Salesman Problem" }), _jsx("p", { className: "text-gray-600", children: "Multiple solving algorithms comparison" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Select, { value: selectedSolver, onValueChange: setSelectedSolver, children: [_jsx(SelectTrigger, { className: "w-[200px]", children: _jsx(SelectValue, { placeholder: "Select solver" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "simulated-annealing", children: "Simulated Annealing" }), _jsx(SelectItem, { value: "brute-force", children: "Brute Force" }), _jsx(SelectItem, { value: "branch-and-bound", children: "Branch and Bound" })] })] }), _jsxs(Button, { variant: "outline", onClick: resetSolution, children: [_jsx(RotateCcw, { className: "w-4 h-4 mr-2" }), "Reset Solution"] }), _jsxs(Button, { variant: "outline", onClick: createNewProblem, children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "New Problem"] }), selectedSolver === 'simulated-annealing' ? (_jsxs(Button, { onClick: () => setIsRunning(!isRunning), variant: isRunning ? 'destructive' : 'default', disabled: isCalculating, children: [isRunning ? (_jsx(Pause, { className: "w-4 h-4 mr-2" })) : (_jsx(Play, { className: "w-4 h-4 mr-2" })), isRunning ? 'Pause' : 'Start'] })) : (_jsx(Button, { onClick: selectedSolver === 'brute-force'
                                    ? solveBruteForce
                                    : solveBranchAndBound, disabled: isCalculating, children: isCalculating ? 'Calculating...' : 'Solve' })), _jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "Settings"] }) }), _jsxs(AlertDialogContent, { className: "sm:max-w-[425px]", children: [_jsx(AlertDialogHeader, { children: _jsx(AlertDialogTitle, { children: "Algorithm Parameters" }) }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "City Count" }), _jsx(CardDescription, { children: "Note: Brute force is only practical for less than 11 cities" })] }), _jsxs(CardContent, { children: [_jsx(Slider, { value: [cityCount], onValueChange: (value) => setCityCount(value[0]), min: 5, max: 50, step: 1 }), _jsxs("p", { className: "mt-2", children: [cityCount, " cities"] })] })] }), selectedSolver === 'simulated-annealing' && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Animation Speed" }) }), _jsxs(CardContent, { children: [_jsx(Slider, { value: [animationSpeed], onValueChange: (value) => setAnimationSpeed(value[0]), min: 5, max: 10000, step: 10 }), _jsxs("p", { className: "mt-2", children: [animationSpeed, " iterations/second"] })] })] }))] })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "City Map" }), _jsxs(CardDescription, { children: ["Current Distance: ", totalDistance(tour, cities).toFixed(2), " | Best Distance: ", bestDistance.toFixed(2)] })] }), _jsx(CardContent, { children: _jsx("div", { className: "relative aspect-square", children: _jsxs("svg", { viewBox: "0 0 100 100", className: "absolute inset-0", children: [showBestPath && drawPath(bestTour, '#22c55e', 0.3), drawPath(tour, '#3b82f6'), cities.map((city) => (_jsxs("g", { children: [_jsx("circle", { cx: city.x, cy: city.y, r: "1.5", fill: "#ef4444" }), _jsx("text", { x: city.x + 2, y: city.y, fontSize: "3", fill: "#374151", children: city.name })] }, city.id)))] }) }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Optimization Progress" }), _jsx(CardDescription, { children: selectedSolver === 'simulated-annealing'
                                            ? `Iteration: ${currentIteration} / ${iterations}`
                                            : `Solver: ${selectedSolver}` })] }), _jsx(CardContent, { children: _jsx("div", { className: "h-[300px]", children: selectedSolver === 'simulated-annealing' ? (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: distanceHistory, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "iteration" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "currentDistance", stroke: "#3b82f6", name: "Current Distance" }), _jsx(Line, { type: "monotone", dataKey: "bestDistance", stroke: "#22c55e", name: "Best Distance" }), _jsx(Line, { type: "monotone", dataKey: "temperature", stroke: "#ef4444", name: "Temperature" })] }) })) : (_jsx("div", { className: "h-full flex items-center justify-center", children: isCalculating ? (_jsx("p", { className: "text-lg text-gray-600", children: "Calculating optimal solution..." })) : (_jsx("p", { className: "text-lg text-gray-600", children: bestDistance !== Infinity
                                                ? `Optimal solution found with distance: ${bestDistance.toFixed(2)}`
                                                : 'Click Solve to find the optimal solution' })) })) }) })] })] }), selectedSolver === 'simulated-annealing' && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Temperature" }) }), _jsxs(CardContent, { children: [_jsx(Slider, { value: [temperature], onValueChange: (value) => setTemperature(value[0]), min: 100, max: 30000, step: 100 }), _jsx("p", { className: "mt-2", children: temperature.toFixed(0) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Cooling Rate" }) }), _jsxs(CardContent, { children: [_jsx(Slider, { value: [coolingRate * 1000], onValueChange: (value) => setCoolingRate(value[0] / 1000), min: 900, max: 999, step: 1 }), _jsx("p", { className: "mt-2", children: coolingRate.toFixed(3) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Iterations" }) }), _jsxs(CardContent, { children: [_jsx(Slider, { value: [iterations], onValueChange: (value) => setIterations(value[0]), min: 100, max: 20000, step: 100 }), _jsx("p", { className: "mt-2", children: iterations })] })] })] }))] }));
};
export default TSPDemo;
