interface ICelestialBody {
    readonly id:            number;
    readonly name:          string;
    readonly radius:        number;
    readonly mass:          number;
    readonly stdGravParam:  number;
    readonly soi:           number;
    readonly color:         number;
}

interface IOrbitingBody extends ICelestialBody {
    readonly meanAnomaly0:  number;
    readonly orbiting:      number;
    readonly orbit:         IOrbit;
    readonly circularVel:   number;
}

interface IOrbit {
    readonly semiMajorAxis:     number;
    readonly apoapsis?:         number;
    readonly periapsis?:        number;
    readonly eccentricity:      number;
    readonly inclination:       number;
    readonly argOfPeriapsis:    number;
    readonly ascNodeLongitude:  number;
    readonly sideralPeriod?:    number;
    readonly orbitalParam?:     number;
    readonly meanMotion?:       number;
}

interface RenderingSettings {
    readonly scale:             number;
    readonly fov:               number;
    readonly nearPlane:         number;
    readonly farPlane:          number;
}

interface SystemDrawSettings {
    readonly planetFarSize:     number;
    readonly satFarSize:        number;
    readonly satDispRadii:      number;
    readonly mouseFocusDst:     number;
}

interface OrbitSettings {
    readonly planetSampPoints:  number;
    readonly satSampPoints:     number;
    readonly lineWidth:         number;
}

interface TrajectoryDrawSettings {
    readonly samplePoints:      number;
    readonly maneuvreArrowSize: number;
}

interface CameraSettings {
    readonly startDist:         number;
    readonly maxDist:           number;
    readonly minDistRadii:      number;
    readonly dampingFactor:     number;
    readonly rotateSpeed:       number;
}

interface TimeSettings {
    readonly hoursPerDay:       number;
    readonly daysPerYear:       number;
}

interface FBSequenceSettings {
    readonly radiusSamples:     number;
    readonly initVelMaxScale:   number;
    readonly initVelSamples:    number;
    readonly maxPropositions:   number;
    readonly maxEvalStatuses:   number;
    readonly maxEvalSequences:  number;
    readonly splitLimit:        number;
}

interface EditorSettings {
    readonly defaultOrigin:     number;
    readonly defaultDest:       number;
    readonly defaultAltitude:   number;
}

interface WorkersSettings {
    readonly progressStep:      number;
}

interface TrajectorySearchSettings {
    readonly splitLimit:        number;
    readonly crossoverProba:    number;
    readonly diffWeight:        number;
    readonly depDVScaleMin:     number;
    readonly depDVScaleMax:     number;
    readonly dsmOffsetMin:      number;
    readonly dsmOffsetMax:      number;
    readonly minLegDuration:    number;
    readonly popSizeDimScale:   number;
    readonly maxGenerations:    number;
}

interface Config {
    readonly rendering:         RenderingSettings;
    readonly solarSystem:       SystemDrawSettings;
    readonly orbit:             OrbitSettings;
    readonly camera:            CameraSettings;
    readonly time:              TimeSettings;
    readonly flybySequence:     FBSequenceSettings;
    readonly trajectorySearch:  TrajectorySearchSettings
    readonly editor:            EditorSettings;
    readonly workers:           WorkersSettings;
    readonly trajectoryDraw:    TrajectoryDrawSettings;
}

interface SequenceParameters {
    readonly departureId:       number, 
    readonly destinationId:     number,
    readonly maxSwingBys:       number,
    readonly maxResonant:       number,
    readonly maxBackLegs:       number,
    readonly maxBackSpacing:    number,
}

type ElapsedYDHMS = {years: number, days: number, hours: number, minutes: number, seconds: number};
type DateYDH = {year: number, day: number, hour: number};

type MessageToWorker = 
    | {label: "initialize", config: any}
    | {label: "run", input?: any}
    | {label: "continue", input?: any}
    | {label: "stop"}
    | {label: "pass", data: any}
;

type MessageFromWorker =     
    | {label: "initialized"}
    | {label: "progress", progress: number, data?: any}
    | {label: "complete", result: any}
    | {label: "stopped"}
    | {label: "debug", data: any}
    | {label: "received"}
;

type ProgressCallback = (progress: number, data?: any) => any;

type GeneratingSequence = {
    sequence: number[], 
    resonant: number, 
    backLegs: number,
    backSpacingExceeded: boolean;
};

type Agent = number[];

type Vector2 = {x: number, y: number};
type Vector3 = {x: number, y: number, z: number};

type OrbitalState2D = {
    pos:    Vector2,
    vel:    Vector2,
    target: number,
};

type OrbitalState3D = {
    pos:    Vector3,
    vel:    Vector3,
};

type OrbitalElements = {
    readonly eccentricity:       number,
    readonly periapsisDir:       Vector3,
    readonly semiMajorAxis:      number,
    readonly inclination:        number,
    readonly argOfPeriapsis:     number,
    readonly ascNodeLongitude:   number,
    readonly ascNodeDir:         Vector3
    readonly orbitalParam:       number
};

type TrajectoryStep = {
    orbitElts:   OrbitalElements, 
    attractorId: number,
    beginAngle:  number,
    endAngle:    number,
    dateOfStart: number,
    duration:    number,
    maneuvre?:   ManeuvreInfo
};

type ManeuvreInfo = {
    deltaVToPrevStep:   Vector3,
    progradeDir:        Vector3,
    manoeuvrePosition:  Vector3,
    context:            ManeuvreContext
}

type ManeuvreContext = 
    | {type: "ejection"}
    | {type: "dsm", originId: number, targetId: number}
    | {type: "circularization"}
;

type LegInfo = {
    duration:    number,
    dsmOffset:   number,
    theta:       number,
    phi:         number
}

type GenerationResult = {
    bestSteps:  TrajectoryStep[],
    bestDeltaV: number,
    popChunk:   Agent[],
    fitChunk:   number[],
}

type ManeuvreDetails = {
    stepIndex:  number,
    dateMET:    number,
    progradeDV: number,
    normalDV:   number,
    radialDV:   number
};

type ResultPanelSpans = {
    dateSpan:       HTMLSpanElement,
    progradeDVSpan: HTMLSpanElement,
    normalDVSpan:   HTMLSpanElement,
    radialDVSpan:   HTMLSpanElement,
    depDateSpan:    HTMLSpanElement,
    totalDVSpan:    HTMLSpanElement;
    maneuvreNumber: HTMLSpanElement
}