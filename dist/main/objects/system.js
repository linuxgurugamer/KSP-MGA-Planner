import { OrbitingBody, CelestialBody } from "./body.js";
import { createLine, createOrbitPoints, createSprite } from "../utilities/geometry.js";
export class SolarSystem {
    constructor(sun, bodies, config) {
        this.config = config;
        this._orbiting = new Map();
        this._objects = new Map();
        this._orbits = new Map();
        this.sun = new CelestialBody(sun);
        for (const data of bodies) {
            const { orbiting } = data;
            const attractor = orbiting == 0 ? this.sun : this._orbiting.get(orbiting);
            const body = new OrbitingBody(data, attractor, this.config.orbit);
            this._orbiting.set(body.id, body);
            attractor.orbiters.push(body);
        }
    }
    get orbiting() {
        return [...this._orbiting.values()];
    }
    get bodies() {
        return [this.sun, ...this.orbiting];
    }
    get data() {
        const data = [];
        for (const body of this.bodies) {
            data.push(body.data);
        }
        return data;
    }
    bodyFromName(name) {
        for (const body of [this.sun, ...this.orbiting]) {
            if (body.name == name)
                return body;
        }
        throw `No body with name ${name}`;
    }
    bodyFromId(id) {
        if (id == 0) {
            return this.sun;
        }
        else {
            const body = this._orbiting.get(id);
            if (!body)
                throw `No body with id ${id}`;
            return body;
        }
    }
    objectsOfBody(id) {
        const object = this._objects.get(id);
        if (!object)
            throw `No 3D objects from body of id ${id}`;
        return object;
    }
    fillSceneObjects(scene, canvas) {
        const textureLoader = new THREE.TextureLoader();
        return new Promise((resolve, _) => {
            const loaded = (texture) => {
                const material = new THREE.SpriteMaterial({
                    map: texture
                });
                const { scale } = this.config.rendering;
                const { satSampPoints, planetSampPoints, lineWidth } = this.config.orbit;
                const { planetFarSize, satFarSize } = this.config.solarSystem;
                const sunSprite = createSprite(material, this.sun.color, true, scale * this.sun.radius * 2);
                const sunGroup = new THREE.Group();
                sunGroup.add(sunSprite);
                this._objects.set(0, sunGroup);
                for (const body of this.orbiting) {
                    const { radius, orbit, color, attractor } = body;
                    const parentGroup = this._objects.get(attractor.id);
                    const bodyGroup = new THREE.Group();
                    const samplePts = attractor.id == 0 ? planetSampPoints : satSampPoints;
                    const spriteSize = attractor.id == 0 ? planetFarSize : satFarSize;
                    const orbitPoints = createOrbitPoints(orbit, samplePts, scale);
                    const ellipse = createLine(orbitPoints, canvas, {
                        color: color,
                        linewidth: lineWidth,
                    });
                    parentGroup.add(ellipse);
                    this._orbits.set(body.id, ellipse);
                    bodyGroup.add(createSprite(material, color, true, scale * radius * 2));
                    bodyGroup.add(createSprite(material, color, false, spriteSize));
                    parentGroup.add(bodyGroup);
                    this._objects.set(body.id, bodyGroup);
                }
                scene.add(sunGroup);
                resolve(true);
            };
            textureLoader.load("sprites/circle-512.png", loaded);
        });
    }
    set date(date) {
        for (const body of this.orbiting) {
            const group = this._objects.get(body.id);
            const pos = body.positionAtDate(date).multiplyScalar(this.config.rendering.scale);
            group.position.copy(pos);
        }
    }
    updateSatellitesDisplay(camController) {
        for (const body of this.orbiting) {
            if (body.attractor.id != 0) {
                const { satDispRadii } = this.config.solarSystem;
                const { scale } = this.config.rendering;
                const camPos = camController.camera.position;
                const objPos = new THREE.Vector3();
                const group = this._objects.get(body.id);
                group.getWorldPosition(objPos);
                const dstToCam = objPos.distanceTo(camPos);
                const thresh = scale * satDispRadii * body.orbit.semiMajorAxis;
                const visible = dstToCam < thresh;
                const ellipse = this._orbits.get(body.id);
                ellipse.visible = visible;
                group.visible = visible;
            }
        }
    }
}
