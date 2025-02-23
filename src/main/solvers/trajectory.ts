import { DiscreteRange } from "../editor/range.js";
import { Selector } from "../editor/selector.js";
import { TimeSelector } from "../editor/time-selector.js";
import { createOrbitPoints, createLine, createSprite } from "../utilities/geometry.js";
import { Orbit } from "../objects/orbit.js";
import { SolarSystem } from "../objects/system.js";
import { KSPTime } from "../utilities/time.js";

export class Trajectory {
    public readonly orbits: Orbit[] = [];

    private readonly _objects:   THREE.Object3D[]  = [];
    private readonly _maneuvres: ManeuvreDetails[] = [];

    static arrowMaterial: THREE.SpriteMaterial;

    constructor(public readonly steps: TrajectoryStep[], public readonly system: SolarSystem, public readonly config: Config) {
        for(const {orbitElts, attractorId} of this.steps) {
            const attractor = this.system.bodyFromId(attractorId);
            const orbit = Orbit.fromOrbitalElements(orbitElts, attractor, config.orbit);
            this.orbits.push(orbit);
        }
    }

    public static preloadArrowMaterial() {
        const textureLoader = new THREE.TextureLoader();
        const loaded = (texture: THREE.Texture) => {
            this.arrowMaterial = new THREE.SpriteMaterial({
                map: texture
            });
        }
        textureLoader.load("sprites/arrow-512.png", loaded);
    } 

    public draw(resolution: {width: number, height: number}){
        this._createTrajectoryArcs(resolution);
        this._createManeuvreSprites();
        this._calculateManeuvresDetails();
    }

    private _createTrajectoryArcs(resolution: {width: number, height: number}){
        const {lineWidth} = this.config.orbit;
        const {samplePoints} = this.config.trajectoryDraw;
        const {scale} = this.config.rendering;

        for(let i = 0; i < this.orbits.length; i++) {
            const orbit = this.orbits[i];
            const {beginAngle, endAngle} = this.steps[i];
            const orbitPoints = createOrbitPoints(orbit, samplePoints, scale, beginAngle, endAngle);
            const color = new THREE.Color(`hsl(${i*35 % 360}, 100%, 85%)`);
            const orbitLine = createLine(orbitPoints, resolution, {
                color:      color.getHex(),
                linewidth:  lineWidth,
            });
            const group = this.system.objectsOfBody(orbit.attractor.id);
            group.add(orbitLine);
            this._objects.push(orbitLine);
        }
    }

    private _createManeuvreSprites(){
        const {maneuvreArrowSize} = this.config.trajectoryDraw;
        const {scale} = this.config.rendering;
        for(const step of this.steps){
            if(step.maneuvre){
                const group = this.system.objectsOfBody(step.attractorId);
                const sprite = createSprite(Trajectory.arrowMaterial, 0xFFFFFF, false, maneuvreArrowSize);
                const {x, y, z} = step.maneuvre.manoeuvrePosition;
                sprite.position.set(x, y, z);
                sprite.position.multiplyScalar(scale);
                group.add(sprite);
                this._objects.push(sprite);
            }
        }
    }

    private _calculateManeuvresDetails(){
        for(let i = 0; i < this.steps.length; i++){
            const step = this.steps[i];
            const {maneuvre} = step;
            if(maneuvre){
                const orbit = this.orbits[i];

                const progradeDir = new THREE.Vector3(
                    maneuvre.progradeDir.x,
                    maneuvre.progradeDir.y,
                    maneuvre.progradeDir.z
                );
                const normalDir = orbit.normal.clone();
                const radialDir = progradeDir.clone();
                radialDir.cross(normalDir);

                const deltaV = new THREE.Vector3(
                    maneuvre.deltaVToPrevStep.x,
                    maneuvre.deltaVToPrevStep.y,
                    maneuvre.deltaVToPrevStep.z,
                );

                const details: ManeuvreDetails = {
                    stepIndex:  i,
                    dateMET:    step.dateOfStart - this.steps[0].dateOfStart,
                    progradeDV: progradeDir.dot(deltaV),
                    normalDV:   normalDir.dot(deltaV),
                    radialDV:   radialDir.dot(deltaV)
                };

                this._maneuvres.push(details);
            }
        }
    }
    
    public fillResultControls(maneuvreSelector: Selector, resultSpans: ResultPanelSpans, stepSlider: DiscreteRange, systemTime: TimeSelector){
        const depDate = new KSPTime(this.steps[0].dateOfStart, this.config.time);

        resultSpans.totalDVSpan.innerHTML = this._totalDeltaV.toFixed(1);
        resultSpans.depDateSpan.innerHTML = depDate.stringYDHMS("hms", "ut");

        resultSpans.depDateSpan.onclick = () => {
            systemTime.time.dateSeconds = depDate.dateSeconds;
            systemTime.update();
            systemTime.onChange();
        };

        stepSlider.setMinMax(0, this.steps.length - 1);
        stepSlider.input((index: number) => this._displayStepsUpTo(index));
        stepSlider.value = this.steps.length - 1;

        const selectorOptions: string[] = [];
        for(let i = 0; i < this._maneuvres.length; i++){
            const details = this._maneuvres[i];
            const step = this.steps[details.stepIndex];
            const context = (<ManeuvreInfo>step.maneuvre).context;
            if(context.type == "ejection") {
                const startBodyName = this.system.bodyFromId(step.attractorId).name;
                const optionName = `${i+1}: ${startBodyName} escape`;
                selectorOptions.push(optionName);
            } else if(context.type == "dsm") {
                const originName = this.system.bodyFromId(context.originId).name;
                const targetName = this.system.bodyFromId(context.targetId).name;
                const optionName = `${i+1}: ${originName}-${targetName} DSM`;
                selectorOptions.push(optionName);
            } else {
                const arrivalBodyName = this.system.bodyFromId(step.attractorId).name;
                const optionName = `${i+1}: ${arrivalBodyName} circularization`;
                selectorOptions.push(optionName);
            }
        }

        maneuvreSelector.fill(selectorOptions);
        maneuvreSelector.change((_: string, index: number) => {
            const details = this._maneuvres[index];
            const dateEMT = new KSPTime(details.dateMET, this.config.time);
            
            resultSpans.dateSpan.innerHTML = dateEMT.stringYDHMS("hm", "emt");
            resultSpans.progradeDVSpan.innerHTML = details.progradeDV.toFixed(1);
            resultSpans.normalDVSpan.innerHTML = details.normalDV.toFixed(1);
            resultSpans.radialDVSpan.innerHTML = details.radialDV.toFixed(1);
            resultSpans.maneuvreNumber.innerHTML = (index + 1).toString();

            resultSpans.dateSpan.onclick = () => {
                systemTime.time.dateSeconds = depDate.dateSeconds + dateEMT.dateSeconds;
                systemTime.update();
                systemTime.onChange();
            };
        });
    }

    private _displayStepsUpTo(index: number){
        for(let i = 0; i < this.steps.length; i++){
            const orbitLine = this._objects[i];
            orbitLine.visible = i <= index;
        }
        const spritesStart = this.steps.length;
        for(let i = 0; i < this._maneuvres.length; i++){
            const visible = this._objects[this._maneuvres[i].stepIndex].visible;
            this._objects[spritesStart + i].visible = visible;
        }
    }

    private get _totalDeltaV(){
        let total = 0;
        for(const details of this._maneuvres){
            const x = details.progradeDV;
            const y = details.normalDV;
            const z = details.radialDV;
            total += new THREE.Vector3(x, y, z).length();
        }
        return total;
    }

    public remove() {
        for(const object of this._objects) {
            if(object.parent) object.parent.remove(object);
        }
    }
}