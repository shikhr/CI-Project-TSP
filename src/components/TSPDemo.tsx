// @ts-nocheck

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Settings, Plus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    if (arr.length <= 1) return [arr];
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
    if (partial.length === n) return totalDistance(partial, cities);

    let bound = 0;
    // Add distances in current partial path
    for (let i = 0; i < partial.length - 1; i++) {
      bound += distance(cities[partial[i]], cities[partial[i + 1]]);
    }

    // For each remaining city, add distance to nearest unvisited neighbor
    let current = partial[partial.length - 1];
    let remaining = Array.from({ length: n }, (_, i) => i).filter(
      (i) => !used.has(i)
    );

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
    if (bound >= bestDist) return;

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

    for (
      let step = 0;
      step < stepsPerFrame && currentIteration + step < iterations;
      step++
    ) {
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
      return (
        <line
          key={`${color}-${i}`}
          x1={city.x}
          y1={city.y}
          x2={nextCity.x}
          y2={nextCity.y}
          stroke={color}
          strokeWidth={opacity * 0.5}
          strokeOpacity={opacity}
        />
      );
    });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Traveling Salesman Problem</h1>
          <p className="text-gray-600">
            Multiple solving algorithms comparison
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedSolver} onValueChange={setSelectedSolver}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select solver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simulated-annealing">
                Simulated Annealing
              </SelectItem>
              <SelectItem value="brute-force">Brute Force</SelectItem>
              <SelectItem value="branch-and-bound">Branch and Bound</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={resetSolution}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Solution
          </Button>

          <Button variant="outline" onClick={createNewProblem}>
            <Plus className="w-4 h-4 mr-2" />
            New Problem
          </Button>

          {selectedSolver === 'simulated-annealing' ? (
            <Button
              onClick={() => setIsRunning(!isRunning)}
              variant={isRunning ? 'destructive' : 'default'}
              disabled={isCalculating}
            >
              {isRunning ? (
                <Pause className="w-4 h-4 mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
          ) : (
            <Button
              onClick={
                selectedSolver === 'brute-force'
                  ? solveBruteForce
                  : solveBranchAndBound
              }
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating...' : 'Solve'}
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-[425px]">
              <AlertDialogHeader>
                <AlertDialogTitle>Algorithm Parameters</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <Card>
                  <CardHeader>
                    <CardTitle>City Count</CardTitle>
                    <CardDescription>
                      Note: Brute force is only practical for less than 11
                      cities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[cityCount]}
                      onValueChange={(value) => setCityCount(value[0])}
                      min={5}
                      max={50}
                      step={1}
                    />
                    <p className="mt-2">{cityCount} cities</p>
                  </CardContent>
                </Card>
                {selectedSolver === 'simulated-annealing' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Animation Speed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Slider
                        value={[animationSpeed]}
                        onValueChange={(value) => setAnimationSpeed(value[0])}
                        min={5}
                        max={10000}
                        step={10}
                      />
                      <p className="mt-2">{animationSpeed} iterations/second</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle>City Map</CardTitle>
            <CardDescription>
              Current Distance: {totalDistance(tour, cities).toFixed(2)} | Best
              Distance: {bestDistance.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-square">
              <svg viewBox="0 0 100 100" className="absolute inset-0">
                {showBestPath && drawPath(bestTour, '#22c55e', 0.3)}
                {drawPath(tour, '#3b82f6')}
                {cities.map((city) => (
                  <g key={city.id}>
                    <circle cx={city.x} cy={city.y} r="1.5" fill="#ef4444" />
                    <text x={city.x + 2} y={city.y} fontSize="3" fill="#374151">
                      {city.name}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimization Progress</CardTitle>
            <CardDescription>
              {selectedSolver === 'simulated-annealing'
                ? `Iteration: ${currentIteration} / ${iterations}`
                : `Solver: ${selectedSolver}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {selectedSolver === 'simulated-annealing' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={distanceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="iteration" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="currentDistance"
                      stroke="#3b82f6"
                      name="Current Distance"
                    />
                    <Line
                      type="monotone"
                      dataKey="bestDistance"
                      stroke="#22c55e"
                      name="Best Distance"
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ef4444"
                      name="Temperature"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {isCalculating ? (
                    <p className="text-lg text-gray-600">
                      Calculating optimal solution...
                    </p>
                  ) : (
                    <p className="text-lg text-gray-600">
                      {bestDistance !== Infinity
                        ? `Optimal solution found with distance: ${bestDistance.toFixed(
                            2
                          )}`
                        : 'Click Solve to find the optimal solution'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedSolver === 'simulated-annealing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Temperature</CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={100}
                max={30000}
                step={100}
              />
              <p className="mt-2">{temperature.toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cooling Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[coolingRate * 1000]}
                onValueChange={(value) => setCoolingRate(value[0] / 1000)}
                min={900}
                max={999}
                step={1}
              />
              <p className="mt-2">{coolingRate.toFixed(3)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Iterations</CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[iterations]}
                onValueChange={(value) => setIterations(value[0])}
                min={100}
                max={20000}
                step={100}
              />
              <p className="mt-2">{iterations}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TSPDemo;
