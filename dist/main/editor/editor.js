import { FlybySequenceGenerator } from "../solvers/sequence-solver.js";
import { TimeSelector } from "./time-selector.js";
import { ErrorMessage } from "./error-msg.js";
import { IntegerInput } from "./integer-input.js";
import { TrajectorySolver } from "../solvers/trajectory-solver.js";
import { BodySelector } from "./body-selector.js";
import { EvolutionPlot } from "./plot.js";
import { ProgressMessage } from "./progress-msg.js";
import { SequenceSelector } from "./sequence-selector.js";
import { SubmitButton, StopButton } from "./buttons.js";
import { FlybySequence } from "../solvers/sequence.js";
import { Trajectory } from "../solvers/trajectory.js";
import { Selector } from "./selector.js";
import { DiscreteRange } from "./range.js";
export function initEditor(controls, system, config, canvas) {
    const systemTime = new TimeSelector("system", config);
    const updateSystemTime = () => {
        systemTime.validate();
        system.date = systemTime.dateSeconds;
        controls.centerOnTarget();
    };
    systemTime.input(updateSystemTime);
    updateSystemTime();
    const sequenceSelector = new SequenceSelector("sequence-selector");
    sequenceSelector.disable();
    const originSelector = new BodySelector("origin-selector", system);
    originSelector.select(config.editor.defaultOrigin);
    const destSelector = new BodySelector("destination-selector", system);
    destSelector.select(config.editor.defaultDest);
    {
        const maxSwingBys = new IntegerInput("max-swingbys");
        const maxResonant = new IntegerInput("max-resonant-swingbys");
        const maxBackLegs = new IntegerInput("max-back-legs");
        const maxBackSpacing = new IntegerInput("max-back-spacing");
        const assertSequenceInputs = () => {
            maxBackSpacing.assertValidity();
            maxSwingBys.assertValidity();
            maxResonant.assertValidity();
            maxBackLegs.assertValidity();
            if (originSelector.body.attractor.id != destSelector.body.attractor.id)
                throw "Origin and destination bodies must orbit the same body.";
            if (originSelector.body.id == destSelector.body.id)
                throw "Same origin and destination bodies.";
        };
        const generator = new FlybySequenceGenerator(system, config);
        const progressMsg = new ProgressMessage("sequence-progress");
        const paramsErr = new ErrorMessage("sequence-params-error");
        const runSequenceGeneration = async () => {
            const onProgress = () => {
                const percent = Math.floor(100 * generator.progression / generator.totalFeasible);
                progressMsg.setMessage(`Evaluation sequences : ${percent}%`);
            };
            const params = {
                departureId: originSelector.body.id,
                destinationId: destSelector.body.id,
                maxBackSpacing: maxBackSpacing.value,
                maxSwingBys: maxSwingBys.value,
                maxResonant: maxResonant.value,
                maxBackLegs: maxBackLegs.value,
            };
            const sequences = await generator.generateFlybySequences(params, onProgress);
            sequenceSelector.fillFrom(sequences);
        };
        const generateSequences = async () => {
            paramsErr.hide();
            try {
                sequenceSelector.disable();
                sequenceSelector.clear();
                progressMsg.enable(1000);
                assertSequenceInputs();
                await runSequenceGeneration();
                sequenceSelector.enable();
            }
            catch (err) {
                if (err != "WORKER CANCELLED")
                    paramsErr.show(err);
                console.error(err);
            }
            finally {
                progressMsg.hide();
            }
        };
        new SubmitButton("sequence-btn").click(() => generateSequences());
        new StopButton("sequence-stop-btn").click(() => generator.cancel());
    }
    {
        const timeRangeStart = new TimeSelector("start", config, true);
        const timeRangeEnd = new TimeSelector("end", config, true);
        const depAltitude = new IntegerInput("start-altitude");
        const updateAltitudeRange = (sequence) => {
            const origin = sequence.bodies[0];
            const max = Math.floor(0.75 * (origin.soi - origin.radius) / 1000);
            depAltitude.setMinMax(0, max);
        };
        depAltitude.value = config.editor.defaultAltitude;
        const customSequence = document.getElementById("custom-sequence");
        const deltaVPlot = new EvolutionPlot("evolution-plot");
        deltaVPlot.hide();
        const solver = new TrajectorySolver(system, config, deltaVPlot);
        const paramsErr = new ErrorMessage("search-params-error");
        let trajectory;
        const maneuvreSelector = new Selector("maneuvre-selector");
        const stepSlider = new DiscreteRange("displayed-steps-slider");
        maneuvreSelector.disable();
        stepSlider.disable();
        const resultSpans = {
            dateSpan: document.getElementById("maneuvre-date"),
            progradeDVSpan: document.getElementById("prograde-delta-v"),
            normalDVSpan: document.getElementById("normal-delta-v"),
            radialDVSpan: document.getElementById("radial-delta-v"),
            depDateSpan: document.getElementById("result-departure-date"),
            totalDVSpan: document.getElementById("result-total-delta-v"),
            maneuvreNumber: document.getElementById("maneuvre-number"),
        };
        const resetFoundTrajectory = () => {
            deltaVPlot.reveal();
            maneuvreSelector.clear();
            maneuvreSelector.disable();
            stepSlider.disable();
            if (trajectory) {
                trajectory.remove();
            }
        };
        const displayFoundTrajectory = () => {
            trajectory = new Trajectory(solver.bestTrajectorySteps, system, config);
            trajectory.draw(canvas);
            trajectory.fillResultControls(maneuvreSelector, resultSpans, stepSlider, systemTime);
            maneuvreSelector.select(0);
            maneuvreSelector.enable();
            stepSlider.enable();
            console.log(solver.bestDeltaV);
        };
        const findTrajectory = async () => {
            paramsErr.hide();
            try {
                let sequence;
                if (customSequence.value == "") {
                    sequence = sequenceSelector.sequence;
                }
                else {
                    sequence = FlybySequence.fromString(customSequence.value, system);
                }
                updateAltitudeRange(sequence);
                const startDate = timeRangeStart.dateSeconds;
                const endDate = timeRangeEnd.dateSeconds;
                if (endDate < startDate)
                    throw "Departure date range end must be greater than the start date.";
                const altitude = depAltitude.value * 1000;
                resetFoundTrajectory();
                const perfStart = performance.now();
                await solver.searchOptimalTrajectory(sequence, startDate, endDate, altitude);
                console.log(`Search time: ${performance.now() - perfStart} ms`);
                displayFoundTrajectory();
            }
            catch (err) {
                if (err != "TRAJECTORY FINDER CANCELLED")
                    paramsErr.show(err);
                console.error(err);
            }
        };
        new SubmitButton("search-btn").click(() => findTrajectory());
        new StopButton("search-stop-btn").click(() => solver.cancel());
    }
}
