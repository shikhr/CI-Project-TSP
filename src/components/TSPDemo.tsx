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
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

const TSPDemo = () => {
  const [cities, setCities] = useState([]);
  const [tour, setTour] = useState([]);
  const [temperature, setTemperature] = useState(1000);
  const [coolingRate, setCoolingRate] = useState(0.995);
  const [iterations, setIterations] = useState(1000);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [bestDistance, setBestDistance] = useState(Infinity);
  const [bestTour, setBestTour] = useState([]);
  const [distanceHistory, setDistanceHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [cityCount, setCityCount] = useState(10);
  const [animationSpeed, setAnimationSpeed] = useState(50);
  const [showBestPath, setShowBestPath] = useState(true);

  const resetSimulation = useCallback(() => {
    const newCities = generateCities(cityCount);
    setCities(newCities);
    const initialTour = Array.from({ length: newCities.length }, (_, i) => i);
    setTour(initialTour);
    setBestTour(initialTour);
    setCurrentIteration(0);
    setBestDistance(totalDistance(initialTour, newCities));
    setDistanceHistory([]);
    setIsRunning(false);
  }, [cityCount]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  const simulateOneStep = useCallback(() => {
    if (!isRunning || currentIteration >= iterations) {
      setIsRunning(false);
      return;
    }

    const currentTemp = temperature * Math.pow(coolingRate, currentIteration);
    const newTour = [...tour];
    const a = Math.floor(Math.random() * newTour.length);
    const b = Math.floor(Math.random() * newTour.length);
    [newTour[a], newTour[b]] = [newTour[b], newTour[a]];

    const currentDistance = totalDistance(tour, cities);
    const newDistance = totalDistance(newTour, cities);
    const delta = newDistance - currentDistance;

    if (delta < 0 || Math.random() < Math.exp(-delta / currentTemp)) {
      setTour(newTour);
      if (newDistance < bestDistance) {
        setBestDistance(newDistance);
        setBestTour(newTour);
      }
    }

    setDistanceHistory((prev) => [
      ...prev,
      {
        iteration: currentIteration,
        currentDistance: currentDistance,
        bestDistance: Math.min(bestDistance, newDistance),
        temperature: currentTemp,
      },
    ]);

    setCurrentIteration((prev) => prev + 1);
  }, [
    isRunning,
    currentIteration,
    iterations,
    temperature,
    coolingRate,
    tour,
    cities,
    bestDistance,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning) {
        simulateOneStep();
      }
    }, 1000 / animationSpeed);

    return () => clearInterval(interval);
  }, [simulateOneStep, isRunning, animationSpeed]);

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
            Optimization using Simulated Annealing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetSimulation}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={() => setIsRunning(!isRunning)}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? 'Pause' : 'Start'}
          </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Animation Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Slider
                      value={[animationSpeed]}
                      onValueChange={(value) => setAnimationSpeed(value[0])}
                      min={1}
                      max={100}
                      step={1}
                    />
                    <p className="mt-2">{animationSpeed} iterations/second</p>
                  </CardContent>
                </Card>
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
              Iteration: {currentIteration} / {iterations}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
            </div>
          </CardContent>
        </Card>
      </div>

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
              max={10000}
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
              max={10000}
              step={100}
            />
            <p className="mt-2">{iterations}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TSPDemo;
