import * as THREE from 'three'

import { Utility } from '../Utility'

import { EventControl } from '../ControlEvent'
import * as CharacterAI from './CharacterAI'
import * as CharacterStates from './CharacterStates'
import { CharacterControls } from '../GameModes'
import { World } from '../World'

import RAPIER from '@dimforge/rapier3d-compat'
import { VectorSpringSimulator } from '../Simulations/VectorSpringSimulator'
import { RelativeSpringSimulator } from '../Simulations/RelativeSpringSimulator'
await RAPIER.init()

//Character class
export class Character extends THREE.Object3D {
	world: World

	height: number
	modelOffset: THREE.Vector3

	visuals: THREE.Group
	modelContainer: THREE.Group

	characterModel: any
	mixer: THREE.AnimationMixer | null
	public allAnim: {
		[id: string]: {
			action: THREE.AnimationAction
			weight: number
			duration: number
		}
	} = {}
	public currentBaseAction: string = 'idle'

	acceleration: THREE.Vector3
	velocity: THREE.Vector3
	simulatedVelocityInfluence: THREE.Vector3
	velocityTarget: THREE.Vector3

	defaultVelocitySimulatorDamping: number
	defaultVelocitySimulatorMass: number
	moveSpeed: number
	velocitySimulator: VectorSpringSimulator

	angularVelocity: number
	orientation: THREE.Vector3
	orientationTarget: THREE.Vector3
	defaultRotationSimulatorDamping: number
	defaultRotationSimulatorMass: number
	rotationSimulator: RelativeSpringSimulator

	viewVector: THREE.Vector3
	behaviour: CharacterAI.Default
	controls: { [id: string]: EventControl }
	characterCapsule: {
		physical: RAPIER.RigidBody
		visual: THREE.Mesh
	}

	private rayResult: THREE.Intersection[]
	rayHasHit: boolean
	rayCastLength: number
	raySafeOffset: number
	wantsToJump: boolean
	justJumped: boolean
	initJumpSpeed: number
	lastGroundImpactData: {
		velocity: THREE.Vector3
	}
	raycastBoxS: THREE.Mesh
	raycastBox: THREE.Mesh

	charState: CharacterStates.DefaultState

	constructor(world: World) {
		super()
		// bind function
		this.setModel = this.setModel.bind(this)
		this.setWeight = this.setWeight.bind(this)
		this.setSimulatedVelocityInfluence = this.setSimulatedVelocityInfluence.bind(this)
		this.setModelOffset = this.setModelOffset.bind(this)
		this.setViewVector = this.setViewVector.bind(this)
		this.setState = this.setState.bind(this)
		this.setPosition = this.setPosition.bind(this)
		this.setArcadeVelocity = this.setArcadeVelocity.bind(this)
		this.setArcadeVelocityTarget = this.setArcadeVelocityTarget.bind(this)
		this.setOrientationTarget = this.setOrientationTarget.bind(this)
		this.setBehaviour = this.setBehaviour.bind(this)
		this.setControl = this.setControl.bind(this)
		this.Control = this.Control.bind(this)
		this.resetControls = this.resetControls.bind(this)
		this.update = this.update.bind(this)
		this.setAnimation = this.setAnimation.bind(this)
		this.prepareCrossFade = this.prepareCrossFade.bind(this)
		this.synchronizeCrossFade = this.synchronizeCrossFade.bind(this)
		this.executeCrossFade = this.executeCrossFade.bind(this)
		this.SpringMovement = this.SpringMovement.bind(this)
		this.SpringRotation = this.SpringRotation.bind(this)
		this.getLocalMovementDirection = this.getLocalMovementDirection.bind(this)
		this.getCameraRelativeMovementVector = this.getCameraRelativeMovementVector.bind(this)
		this.setGlobalDirectionGoal = this.setGlobalDirectionGoal.bind(this)
		this.rotateModel = this.rotateModel.bind(this)
		this.jump = this.jump.bind(this)
		this.preStep = this.preStep.bind(this)
		this.postStep = this.postStep.bind(this)

		//init
		this.world = world

		// Geometry
		this.height = 1
		this.modelOffset = new THREE.Vector3()

		// The visuals group is centered for easy character tilting
		this.visuals = new THREE.Group()
		this.add(this.visuals)

		// Model container is used to reliably ground the character, as animation can alter the position of the model itself
		this.modelContainer = new THREE.Group()
		this.modelContainer.position.y = -this.height / 2
		this.visuals.add(this.modelContainer) //

		// Default model
		let capsuleGeometry = Utility.createCapsuleGeometry(this.height / 4, this.height / 2, 8)

		let capsule = new THREE.Mesh(capsuleGeometry, new THREE.MeshLambertMaterial({ color: 0xffffff }))
		capsule.position.set(0, this.height / 2, 0)
		capsule.castShadow = true

		// Assign model to character
		this.characterModel = capsule
		// Attach model to model container
		this.modelContainer.add(capsule)

		// Animation mixer - gets set when calling setModel()
		this.mixer = null

		// Movement
		this.acceleration = new THREE.Vector3()
		this.velocity = new THREE.Vector3()
		this.simulatedVelocityInfluence = new THREE.Vector3()
		this.velocityTarget = new THREE.Vector3()
		// Velocity spring simulator
		this.defaultVelocitySimulatorDamping = 0.8
		this.defaultVelocitySimulatorMass = 50
		this.moveSpeed = 8
		this.velocitySimulator = new VectorSpringSimulator(
			60,
			this.defaultVelocitySimulatorMass,
			this.defaultVelocitySimulatorDamping
		)

		// Rotation
		this.angularVelocity = 0
		this.orientation = new THREE.Vector3(0, 0, 1)
		this.orientationTarget = new THREE.Vector3(0, 0, 1)
		// Rotation spring simulator
		this.defaultRotationSimulatorDamping = 0.5
		this.defaultRotationSimulatorMass = 10
		this.rotationSimulator = new RelativeSpringSimulator(
			60,
			this.defaultRotationSimulatorMass,
			this.defaultRotationSimulatorDamping
		)

		// States
		this.charState = new CharacterStates.Idle(this) //this.setState(CharacterStates.Idle);
		this.viewVector = new THREE.Vector3()

		// Controls
		this.behaviour = new CharacterAI.Default(this)
		this.controls = {
			up: new EventControl(),
			down: new EventControl(),
			left: new EventControl(),
			right: new EventControl(),
			run: new EventControl(),
			jump: new EventControl(),
			use: new EventControl(),
			primary: new EventControl(),
			secondary: new EventControl(),
			tertiary: new EventControl(),
			lastControl: new EventControl(),
		}

		// Physics
		// Player Capsule
		this.characterCapsule = world.createCapsulePrimitive({
			mass: 1,
			position: new RAPIER.Vector3(0, 1, 0),
			height: 0.5,
			radius: 0.25,
			segments: 8,
			friction: 0,
			visible: false,
		})
		this.characterCapsule.visual.visible = true

		// Move character to different collision group for raycasting
		// this.characterCapsule.physical.collisionFilterGroup = 2;

		// Disable character rotation
		this.characterCapsule.physical.lockRotations(true, true)
		this.characterCapsule.physical.setEnabledRotations(false, false, false, true)

		// this.characterCapsule.physical.updateMassProperties();

		// Ray casting
		this.rayResult = []
		this.rayHasHit = false
		this.rayCastLength = 0.63
		this.raySafeOffset = 0.03
		this.wantsToJump = false
		this.justJumped = false
		this.initJumpSpeed = -1
		this.lastGroundImpactData = {
			velocity: new THREE.Vector3(0, 0, 0),
		}

		// Ray cast debug
		const boxGeoS = new THREE.BoxGeometry(1, 0.01, 1)
		const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1)
		const boxMat = new THREE.MeshLambertMaterial({
			color: 0xff0000,
		})
		const boxMatS = new THREE.MeshLambertMaterial({
			color: 0x0000ff,
		})
		this.raycastBoxS = new THREE.Mesh(boxGeoS, boxMatS)
		this.raycastBoxS.visible = false
		this.raycastBox = new THREE.Mesh(boxGeo, boxMat)
		this.raycastBox.visible = true

		// PreStep event
		this.characterCapsule.physical.enableCcd(true)
		this.world.preStep.push(this.preStep)

		// PostStep event
		this.world.postStep.push(this.postStep)
	}

	setModel(model: any) {
		this.modelContainer.remove(this.characterModel)
		this.characterModel = model
		this.modelContainer.add(this.characterModel)
		this.mixer = new THREE.AnimationMixer(this.characterModel)

		for (let i = 0; i !== this.characterModel.animations.length; ++i) {
			if (this.mixer === null) continue
			let clip = this.characterModel.animations[i]
			const name = clip.name
			const action = this.mixer.clipAction(clip)

			this.allAnim[name] = {
				action: action,
				weight: name.toLowerCase() === 'idle' ? 1 : 0,
				duration: clip.duration,
			}

			this.setWeight(action, this.allAnim[name].weight)
			action.play()
		}

		this.setState(CharacterStates.Idle)
	}

	private setWeight(action: THREE.AnimationAction, weight: number) {
		action.enabled = true
		action.setEffectiveTimeScale(1)
		action.setEffectiveWeight(weight)
	}

	setSimulatedVelocityInfluence(x: number, y = x, z = x) {
		this.simulatedVelocityInfluence.set(x, y, z)
	}

	setModelOffset(offset: THREE.Vector3) {
		this.modelOffset.copy(offset)
	}

	setViewVector(vector: THREE.Vector3) {
		this.viewVector.copy(vector).normalize()
	}

	/**
	 * Set state to the player. Pass state class (function) name.
	 * @param {function} State
	 */
	setState(State: any) {
		this.charState = new State(this)
	}

	setPosition(x: number, y: number, z: number) {
		this.characterCapsule.physical.setTranslation(new RAPIER.Vector3(x, y, z), true)
	}

	setArcadeVelocity(velZ: number, velX = 0) {
		this.velocity.z = velZ
		this.velocity.x = velX
	}

	setArcadeVelocityTarget(velZ: number, velX = 0) {
		this.velocityTarget.z = velZ
		this.velocityTarget.x = velX
	}

	setOrientationTarget(vector: THREE.Vector3) {
		this.orientationTarget.copy(vector).setY(0).normalize()
	}

	setBehaviour(behaviour: CharacterAI.Default) {
		behaviour.character = this
		this.behaviour = behaviour
	}

	setControl(key: string, value: boolean) {
		// Get action and set it's parameters
		let action = this.controls[key]

		action.value = value

		// Set the 'just' attributes
		if (value) action.justPressed = true
		else action.justReleased = true

		// Tag control as last activated
		this.controls.lastControl = action

		// Tell player to handle states according to new input
		this.charState.changeState()

		// Reset the 'just' attributes
		action.justPressed = false
		action.justReleased = false
	}

	Control() {
		this.world.gameMode = new CharacterControls(this.world, this)
	}

	resetControls() {
		this.setControl('up', false)
		this.setControl('down', false)
		this.setControl('left', false)
		this.setControl('right', false)
		this.setControl('run', false)
		this.setControl('jump', false)
		this.setControl('use', false)
		this.setControl('primary', false)
		this.setControl('secondary', false)
		this.setControl('tertiary', false)
	}

	update(timeStep: number /* , options */) {
		let defaults = {
			SpringRotation: true,
			RotationMultiplier: 1,
			SpringVelocity: true,
			rotateModel: true,
			updateAnimation: true,
		}
		let options = defaults //Utils.setDefaults(options, defaults);

		this.visuals.position.copy(this.modelOffset)
		if (options.SpringVelocity) this.SpringMovement(timeStep)
		if (options.SpringRotation) this.SpringRotation(timeStep, options.RotationMultiplier)
		if (options.rotateModel) this.rotateModel()
		const names = Object.keys(this.allAnim)

		for (let i = 0; i !== names.length; ++i) {
			const settings = this.allAnim[names[i]]
			const action = settings.action
			settings.weight = action.getEffectiveWeight()
		}
		if (options.updateAnimation && this.mixer != null) this.mixer.update(timeStep)

		this.position.set(
			this.characterCapsule.physical.collider(0).translation().x,
			this.characterCapsule.physical.collider(0).translation().y - this.height / 2,
			this.characterCapsule.physical.collider(0).translation().z
		)
	}

	setAnimation(clipName: string, fadeIn: number) {
		/* if (this.mixer != null) {
			let clips = this.characterModel.animations
			let clip = THREE.AnimationClip.findByName(clips, clipName)
			let action = this.mixer.clipAction(clip)
			this.mixer.stopAllAction()
			action.reset()
			action.fadeIn(fadeIn)
			action.play()

			return action.getClip().duration
		}
		return -1 */

		const currentSettings = this.allAnim[this.currentBaseAction]
		const currentAction = currentSettings ? currentSettings.action : null
		const action = this.allAnim[clipName] ? this.allAnim[clipName].action : null
		if (currentAction !== null && action !== null && currentAction !== action) {
			this.prepareCrossFade(currentAction, action, fadeIn)
		}
		let duration: number = 0.1
		if (this.allAnim[clipName] !== undefined) duration = this.allAnim[clipName].duration
		return duration
	}

	private prepareCrossFade(startAction: THREE.AnimationAction, endAction: THREE.AnimationAction, duration: number) {
		// If the current action is 'idle', execute the crossfade immediately;
		// else wait until the current action has finished its current loop

		if (this.currentBaseAction === 'idle' || !startAction || !endAction) {
			this.executeCrossFade(startAction, endAction, duration)
		} else {
			this.synchronizeCrossFade(startAction, endAction, duration)
		}

		// Update control colors

		if (endAction) {
			const clip = endAction.getClip()
			this.currentBaseAction = clip.name
		} else {
			this.currentBaseAction = 'None'
		}
	}

	private synchronizeCrossFade(
		startAction: THREE.AnimationAction,
		endAction: THREE.AnimationAction,
		duration: number
	) {
		// const onLoopFinished = (event: any) => {
		// 	if (event.action === startAction) {
		// 		if (this.mixer !== null) this.mixer.removeEventListener('loop', onLoopFinished)
		this.executeCrossFade(startAction, endAction, duration)
		// 	}
		// }
		// if (this.mixer !== null) this.mixer.addEventListener('loop', onLoopFinished)
	}

	private executeCrossFade(startAction: THREE.AnimationAction, endAction: THREE.AnimationAction, duration: number) {
		// Not only the start action, but also the end action must get a weight of 1 before fading
		// (concerning the start action this is already guaranteed in this place)

		if (endAction) {
			this.setWeight(endAction, 1)
			endAction.time = 0
			if (startAction) {
				// Crossfade with warping
				startAction.crossFadeTo(endAction, duration, true)
			} else {
				// Fade in
				endAction.fadeIn(duration)
			}
		} else {
			// Fade out
			startAction.fadeOut(duration)
		}
	}

	SpringMovement(timeStep: number) {
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget)
		this.velocitySimulator.simulate(timeStep)

		// Update values
		this.velocity.copy(this.velocitySimulator.position)
		this.acceleration.copy(this.velocitySimulator.velocity)
	}

	SpringRotation(timeStep: number, RotationMultiplier: number) {
		//Spring rotation
		//Figure out angle between current and target orientation
		let angle = Utility.getAngleBetweenVectors(this.orientation, this.orientationTarget)

		// Simulator
		this.rotationSimulator.target = angle * RotationMultiplier
		this.rotationSimulator.simulate(timeStep)
		let rot = this.rotationSimulator.position

		// Updating values
		this.orientation.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		this.angularVelocity = this.rotationSimulator.velocity
	}

	getLocalMovementDirection() {
		const positiveX = this.controls.right.value ? -1 : 0
		const negativeX = this.controls.left.value ? 1 : 0
		const positiveZ = this.controls.up.value ? 1 : 0
		const negativeZ = this.controls.down.value ? -1 : 0

		return new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ)
	}

	getCameraRelativeMovementVector() {
		const localDirection = this.getLocalMovementDirection()
		const flatViewVector = new THREE.Vector3(this.viewVector.x, 0, this.viewVector.z)

		return Utility.appplyVectorMatrixXZ(flatViewVector, localDirection)
	}

	setGlobalDirectionGoal() {
		let moveVector = this.getCameraRelativeMovementVector()

		if (moveVector.x == 0 && moveVector.y == 0 && moveVector.z == 0) {
			this.setOrientationTarget(this.orientation)
		} else {
			this.setOrientationTarget(new THREE.Vector3().copy(moveVector))
		}
	}

	rotateModel() {
		this.visuals.lookAt(this.orientation.x * 1000, this.visuals.position.y, this.orientation.z * 1000)
		this.visuals.rotateZ(-this.angularVelocity * 2.3 * this.velocity.length())
		this.visuals.position.setY(this.visuals.position.y + Math.cos(Math.abs(this.angularVelocity * 2.3)) / 2)
	}

	jump(initJumpSpeed = -1) {
		this.wantsToJump = true
		this.initJumpSpeed = initJumpSpeed
	}

	preStep() {
		const pos = new THREE.Vector3().copy(this.characterCapsule.physical.translation())
		const vel = new THREE.Vector3().copy(this.characterCapsule.physical.linvel())
		const start = new THREE.Vector3().copy(pos) //.add(new THREE.Vector3(0, -((this.height / 2) + this.modelOffset.y), 0))
		let objs: THREE.Object3D[] = []
		for (let i = 0; i < this.world.parallelPairs.length; i++) {
			if (this.characterCapsule.visual !== this.world.parallelPairs[i].visual)
				objs.push(this.world.parallelPairs[i].visual)
		}
		this.raycastBoxS.position.copy(start)
		const rayCast = new THREE.Raycaster(
			start,
			new THREE.Vector3(0, -1, 0),
			this.height / 2 + this.raySafeOffset,
			this.rayCastLength
		)
		this.rayResult = rayCast.intersectObjects(objs)
		this.rayHasHit = this.rayResult.length > 0

		// Jumping
		if (this.wantsToJump && this.rayHasHit) {
			// If initJumpSpeed is set
			if (this.initJumpSpeed > -1) {
				// Flatten velocity
				vel.y = 0

				// Velocity needs to be at least as much as initJumpSpeed
				if (vel.lengthSq() < this.initJumpSpeed ** 2) {
					vel.normalize()
					vel.multiplyScalar(this.initJumpSpeed)
				}
			}

			// Add positive vertical velocity
			vel.y += 4
			//Move above ground
			pos.y += this.raySafeOffset
			// Set flag for postStep and character states
			this.justJumped = true
		}
		//Reset flag
		this.wantsToJump = false

		this.characterCapsule.physical.setTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z), true)
		this.characterCapsule.physical.setLinvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true)
	}

	postStep() {
		const pos = new THREE.Vector3().copy(this.characterCapsule.physical.translation())
		const vel = new THREE.Vector3().copy(this.characterCapsule.physical.linvel())
		// Player ray casting
		// Get velocities
		let simulatedVelocity = new THREE.Vector3().copy(vel)
		let arcadeVelocity = new THREE.Vector3().copy(this.velocity).multiplyScalar(this.moveSpeed)
		arcadeVelocity = Utility.appplyVectorMatrixXZ(this.orientation, arcadeVelocity)

		let newVelocity = new THREE.Vector3(
			THREE.MathUtils.lerp(arcadeVelocity.x, simulatedVelocity.x, this.simulatedVelocityInfluence.x),
			THREE.MathUtils.lerp(arcadeVelocity.y, simulatedVelocity.y, this.simulatedVelocityInfluence.y),
			THREE.MathUtils.lerp(arcadeVelocity.z, simulatedVelocity.z, this.simulatedVelocityInfluence.z)
		)

		// If just jumped, don't stick to ground
		if (this.justJumped) this.justJumped = false
		else {
			// If we're hitting the ground, stick to ground
			if (this.rayHasHit) {
				if (this.raycastBox.visible) this.raycastBox.position.copy(this.rayResult[0].point)
				pos.y = this.rayResult[0].point.y + this.rayCastLength - this.raySafeOffset
				vel.set(newVelocity.x, 0, newVelocity.z)
			} else {
				// If we're in air
				if (this.raycastBox.visible) this.raycastBox.position.set(pos.x, pos.y - this.rayCastLength, pos.z)

				vel.set(newVelocity.x, newVelocity.y, newVelocity.z)
				this.lastGroundImpactData.velocity.set(vel.x, vel.y, vel.z)
			}
		}

		this.characterCapsule.physical.setTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z), true)
		this.characterCapsule.physical.setLinvel(new RAPIER.Vector3(vel.x, vel.y, vel.z), true)
	}
}
