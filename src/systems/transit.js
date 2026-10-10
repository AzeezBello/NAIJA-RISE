import { G } from '../core/context.js';
import { emit } from '../core/events.js';
import { fmt } from '../core/utils.js';
import { VEH } from '../data/vehicles.js';
import { heightAt } from '../world/terrain.js';
import { pay, addRep, xp } from './economy.js';
import { startDialog } from './dialogue.js';
import { toast } from '../ui/feedback.js';

export function nearTransitVehicle(radius = 20) {
  if (G.inCar || G.transitRide || !G.traffic) return null;
  let closest = null;
  let bestDistance = radius;
  for (const vehicle of G.traffic) {
    if (!vehicle?.stoppedAtStop || vehicle.hidden) continue;
    const distance = vehicle.g.position.distanceTo(G.player.position);
    if (distance < bestDistance) {
      closest = vehicle;
      bestDistance = distance;
    }
  }
  return closest;
}

export function startTransitDialog(vehicle) {
  if (!vehicle?.stoppedAtStop || G.transitRide) return;
  vehicle.boardingHold = true;
  const stops = vehicle.transitStops;
  const currentIndex = vehicle.stopIndex;
  let direction = vehicle.dir;
  if (!stops[currentIndex + direction]) direction *= -1;

  const choices = [];
  for (let index = currentIndex + direction; stops[index]; index += direction) {
    const destination = stops[index];
    const stopCount = Math.abs(index - currentIndex);
    const fare = (VEH[vehicle.type]?.fare || 300) + (stopCount - 1) * 100;
    choices.push({
      label: `${destination.name} · ${fmt(fare)}`,
      apply() {
        if (!vehicle.stoppedAtStop) {
          vehicle.boardingHold = false;
          return toast('The bus has already left');
        }
        if (!pay(fare, `Bus fare · ${destination.name}`)) {
          vehicle.boardingHold = false;
          return toast('Not enough money for that fare');
        }
        vehicle.boardingHold = false;
        G.transitRide = { vehicle, destination };
        G.player.visible = false;
        G.player.position.copy(vehicle.g.position);
        addRep('street', 1);
        xp(1);
        toast(`On board · ${destination.name}`);
      },
    });
  }

  choices.push({
    label: 'Wait for another bus',
    apply() { vehicle.boardingHold = false; },
  });
  startDialog(
    [{
      s: vehicle.type === 'brt' ? 'brt_driver' : 'driver',
      t: `${vehicle.stoppedAtStop.name}. Where you dey go?`,
    }],
    choices,
    choice => {
      choice.apply();
      emit('hud');
    }
  );
}

export function updateTransitRide() {
  const ride = G.transitRide;
  if (!ride) return;
  const { vehicle, destination } = ride;
  if (!vehicle?.g || !G.player) {
    G.transitRide = null;
    if (G.player) G.player.visible = true;
    return;
  }
  G.player.position.copy(vehicle.g.position);
  if (vehicle.stoppedAtStop?.id !== destination.id) return;

  G.player.position.set(destination.x, 0, destination.z);
  G.player.position.y = heightAt(destination.x, destination.z);
  G.player.visible = true;
  G.playerChar?.setState('idle', 0);
  G.transitRide = null;
  toast(`Arrived at ${destination.name}`);
  emit('hud');
}
