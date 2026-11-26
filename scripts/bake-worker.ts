/* Thread de calcul : une tranche de sommets. */
import { parentPort, workerData } from 'node:worker_threads';
import { bakeRange, type Job } from './bake-core';

parentPort!.postMessage(bakeRange(workerData as Job));
