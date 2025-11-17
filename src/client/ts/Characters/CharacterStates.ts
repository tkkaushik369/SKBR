import * as THREE from 'three'
import { Character } from './Character'
import { Utility } from '../Utility'
import { EventControl } from '../ControlEvent'

//
// Default state
//
export class DefaultState {
	character: Character
	timer: number
	animationLength: number

	/**
	 * @param {Character} character
	 */
	constructor(character: Character) {
		// bind  functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)
		this.noDirection = this.noDirection.bind(this)
		this.anyDirection = this.anyDirection.bind(this)
		this.justPressed = this.justPressed.bind(this)
		this.isPressed = this.isPressed.bind(this)
		this.justReleased = this.justReleased.bind(this)
		this.fallInAir = this.fallInAir.bind(this)
		this.animationEnded = this.animationEnded.bind(this)
		this.setAppropriateDropState = this.setAppropriateDropState.bind(this)
		this.setAppropriateStartWalkState = this.setAppropriateStartWalkState.bind(this)
		this.setAnimation = this.setAnimation.bind(this)

		// init
		this.character = character

		this.character.velocitySimulator.damping = this.character.defaultVelocitySimulatorDamping
		this.character.velocitySimulator.mass = this.character.defaultVelocitySimulatorMass

		this.character.rotationSimulator.damping = this.character.defaultRotationSimulatorDamping
		this.character.rotationSimulator.mass = this.character.defaultRotationSimulatorMass

		this.character.setSimulatedVelocityInfluence(0, 1, 0)

		this.timer = 0
		this.animationLength = 0
	}

	update(timeStep: number) {
		this.timer += timeStep
	}

	changeState() {}

	noDirection() {
		return (
			!this.character.controls.up.value &&
			!this.character.controls.down.value &&
			!this.character.controls.left.value &&
			!this.character.controls.right.value
		)
	}

	anyDirection() {
		return (
			this.character.controls.up.value ||
			this.character.controls.down.value ||
			this.character.controls.left.value ||
			this.character.controls.right.value
		)
	}

	justPressed(control: EventControl) {
		return this.character.controls.lastControl == control && control.justPressed
	}

	isPressed(control: EventControl) {
		return control.value
	}

	justReleased(control: EventControl) {
		return this.character.controls.lastControl == control && control.justReleased
	}

	fallInAir() {
		if (!this.character.rayHasHit) this.character.setState(Falling)
	}

	animationEnded(timeStep: number) {
		if (this.character.mixer != null) {
			if (this.animationLength == -1) {
				console.error(this.constructor.name + 'Error: Set this.animationLength in state constructor!')
				return false
			} else {
				return this.timer > this.animationLength - timeStep
			}
		} else return true
	}

	setAppropriateDropState() {
		if (this.character.lastGroundImpactData.velocity.y < -6) {
			this.character.setState(DropRolling)
		} else if (this.anyDirection()) {
			this.character.setState(DropRunning)
		} else {
			this.character.setState(DropIdle)
		}
	}

	setAppropriateStartWalkState() {
		let range = Math.PI
		let dir = this.character.getCameraRelativeMovementVector()
		let angle = Utility.getAngleBetweenVectors(this.character.orientation, new THREE.Vector3().copy(dir))

		if (angle > range * 0.4) {
			this.character.setState(StartWalkLeft)
		} else if (angle > range * 0.7) {
			this.character.setState(StartWalkBackLeft)
		} else if (angle < -range * 0.4) {
			this.character.setState(StartWalkRight)
		} else if (angle < -range * 0.7) {
			this.character.setState(StartWalkBackRight)
		} else {
			this.character.setState(StartWalkForward)
		}
	}

	setAnimation(name: string, fadein: number) {
		const duration = this.character.setAnimation(name, fadein)
		if (duration !== -1) this.animationLength = duration
		else this.animationLength = 0
	}
}

//
// Idle
//
export class Idle extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind function
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.damping = 0.6
		this.character.velocitySimulator.mass = 10

		this.character.setArcadeVelocityTarget(0)
		this.character.setAnimation('idle', 0.3)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.update(timeStep)

		this.fallInAir()
	}
	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpIdle)
		}

		if (this.anyDirection()) {
			if (this.character.velocity.length() > 0.5) {
				this.character.setState(Walk)
			} else {
				this.setAppropriateStartWalkState()
			}
		}
	}
}

//
// Idle
//
export class IdleRotateRight extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.rotationSimulator.mass = 30
		this.character.rotationSimulator.damping = 0.6

		this.character.velocitySimulator.damping = 0.6
		this.character.velocitySimulator.mass = 10

		this.character.setArcadeVelocityTarget(0)
		this.setAnimation('rotate_right', 0.1)
	}

	update(timeStep: number) {
		super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Idle)
		}

		this.character.update(timeStep)

		this.fallInAir()
	}
	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpIdle)
		}

		if (this.anyDirection()) {
			if (this.character.velocity.length() > 0.5) {
				this.character.setState(Walk)
			} else {
				this.setAppropriateStartWalkState()
			}
		}
	}
}

//
// Idle
//
export class IdleRotateLeft extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.rotationSimulator.mass = 30
		this.character.rotationSimulator.damping = 0.6

		this.character.velocitySimulator.damping = 0.6
		this.character.velocitySimulator.mass = 10

		this.character.setArcadeVelocityTarget(0)
		this.setAnimation('rotate_left', 0.1)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Idle)
		}

		this.fallInAir()
	}

	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpIdle)
		}

		if (this.anyDirection()) {
			if (this.character.velocity.length() > 0.5) {
				this.character.setState(Walk)
			} else {
				this.setAppropriateStartWalkState()
			}
		}
	}
}

//
// Walk
//
export class Walk extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.setArcadeVelocityTarget(0.8)
		this.character.setAnimation('run', 0.1)

		if (this.noDirection()) {
			this.character.setState(EndWalk)
		}
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.update(timeStep)

		this.fallInAir()

		if (this.isPressed(this.character.controls.run)) {
			this.character.setState(Sprint)
		}
	}

	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpRunning)
		}

		if (this.noDirection()) {
			if (this.character.velocity.length() > 1) {
				this.character.setState(EndWalk)
			} else {
				this.character.setState(Idle)
			}
		}
	}
}

//
// Sprint
//
export class Sprint extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.mass = 10
		this.character.rotationSimulator.damping = 0.8
		this.character.rotationSimulator.mass = 50

		this.character.setArcadeVelocityTarget(1.4)
		this.character.setAnimation('sprint', 0.3)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.update(timeStep)

		this.fallInAir()
	}

	changeState() {
		if (this.justReleased(this.character.controls.run)) {
			this.character.setState(Walk)
		}

		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpRunning)
		}

		if (this.noDirection()) {
			this.character.setState(EndWalk)
		}
	}
}

//
// Base for start states
//
export class StartBaseState extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.rotationSimulator.mass = 20
		this.character.rotationSimulator.damping = 0.7

		this.character.setArcadeVelocityTarget(0.8)
	}

	update(timeStep: number) {
		super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Walk)
		}

		this.character.setGlobalDirectionGoal()

		this.character.update(timeStep)

		this.fallInAir()
	}

	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpRunning)
		}

		if (this.noDirection()) {
			if (this.timer < 0.1) {
				let angle = Utility.getAngleBetweenVectors(this.character.orientation, this.character.orientationTarget)

				if (angle > Math.PI * 0.4) {
					this.character.setState(IdleRotateLeft)
				} else if (angle < -Math.PI * 0.4) {
					this.character.setState(IdleRotateRight)
				} else {
					this.character.setState(Idle)
				}
			} else {
				this.character.setState(Idle)
			}
		}

		if (this.justPressed(this.character.controls.run)) {
			this.character.setState(Sprint)
		}
	}
}

//
// Start Walk Forward
//
export class StartWalkForward extends StartBaseState {
	constructor(character: Character) {
		super(character)
		this.setAnimation('start_forward', 0.1)
	}
}

//
// Start Walk Left
//
export class StartWalkLeft extends StartBaseState {
	constructor(character: Character) {
		super(character)
		this.setAnimation('start_left', 0.1)
	}
}

//
// Start Walk Left
//
export class StartWalkRight extends StartBaseState {
	constructor(character: Character) {
		super(character)
		this.setAnimation('start_right', 0.1)
	}
}

//
// Start Walk Left
//
export class StartWalkBackLeft extends StartBaseState {
	constructor(character: Character) {
		super(character)
		this.setAnimation('start_back_left', 0.1)
	}
}

//
// Start Walk Left
//
export class StartWalkBackRight extends StartBaseState {
	constructor(character: Character) {
		super(character)
		this.setAnimation('start_back_left', 0.1)
	}
}

//
// End Walk
//
export class EndWalk extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.setArcadeVelocityTarget(0)
		this.setAnimation('stop', 0.1)
	}

	update(timeStep: number) {
		super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Idle)
		}

		this.character.update(timeStep)
		this.fallInAir()
	}

	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpIdle)
		}

		if (this.anyDirection()) {
			if (this.isPressed(this.character.controls.run)) {
				this.character.setState(Sprint)
			} else {
				if (this.character.velocity.length() > 0.5) {
					this.character.setState(Walk)
				} else {
					this.setAppropriateStartWalkState()
				}
			}
		}
	}
}

//
// Jump Idle
//
export class JumpIdle extends DefaultState {
	alreadyJumped: boolean

	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.mass = 50

		this.character.setArcadeVelocityTarget(0)
		this.setAnimation('jump_idle', 0.1)
		this.alreadyJumped = false
	}

	update(timeStep: number) {
		super.update(timeStep)

		// Move in air
		if (this.alreadyJumped) {
			this.character.setGlobalDirectionGoal()
			this.character.setArcadeVelocityTarget(this.anyDirection() ? 0.8 : 0)
		}
		this.character.update(timeStep)

		//Physically jump
		if (this.timer > 0.2 && !this.alreadyJumped) {
			this.character.jump()
			this.alreadyJumped = true

			this.character.velocitySimulator.mass = 100
			this.character.rotationSimulator.damping = 0.3
			this.character.setSimulatedVelocityInfluence(0.7, 1, 0.7)
		} else if (this.timer > 0.3 && this.character.rayHasHit) {
			this.setAppropriateDropState()
		} else if (this.timer > this.animationLength - timeStep) {
			this.character.setState(Falling)
		}
	}
}

//
// Jump Running
//
export class JumpRunning extends DefaultState {
	alreadyJumped: boolean

	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.mass = 100
		this.setAnimation('jump_running', 0.1)
		this.alreadyJumped = false
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()

		// Move in air
		if (this.alreadyJumped) {
			this.character.setArcadeVelocityTarget(this.anyDirection() ? 0.8 : 0)
		}
		this.character.update(timeStep)

		//Physically jump
		if (this.timer > 0.14 && !this.alreadyJumped) {
			this.character.jump(4)
			this.alreadyJumped = true

			this.character.rotationSimulator.damping = 0.3
			this.character.setSimulatedVelocityInfluence(0.98, 1, 0.98)
		} else if (this.timer > 0.24 && this.character.rayHasHit) {
			this.setAppropriateDropState()
		} else if (this.timer > this.animationLength - timeStep) {
			this.character.setState(Falling)
		}
	}
}

//
// Falling
//
export class Falling extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.mass = 100
		this.character.rotationSimulator.damping = 0.3

		this.character.setSimulatedVelocityInfluence(0.98, 1, 0.98)

		this.character.setAnimation('falling', 0.3)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.setArcadeVelocityTarget(this.anyDirection() ? 0.8 : 0)

		this.character.update(timeStep)

		if (this.character.rayHasHit) {
			this.setAppropriateDropState()
		}
	}
}

//
// Drop Idle
//
export class DropIdle extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.damping = 0.5
		this.character.velocitySimulator.mass = 7

		this.character.setArcadeVelocityTarget(0)
		this.setAnimation('drop_idle', 0.1)

		if (this.anyDirection()) {
			this.character.setState(StartWalkForward)
		}
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Idle)
		}

		this.fallInAir()
	}

	changeState() {
		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpIdle)
		}

		if (this.anyDirection()) {
			this.character.setState(StartWalkForward)
		}
	}
}

//
// Drop Running
//
export class DropRunning extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.setArcadeVelocityTarget(0.8)
		this.setAnimation('drop_running', 0.1)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(Walk)
		}

		this.fallInAir()
	}

	changeState() {
		if (this.noDirection()) {
			this.character.setState(EndWalk)
		}

		if (this.anyDirection() && this.justPressed(this.character.controls.run)) {
			this.character.setState(Sprint)
		}

		if (this.justPressed(this.character.controls.jump)) {
			this.character.setState(JumpRunning)
		}
	}
}

//
// Drop Running
//
export class DropRolling extends DefaultState {
	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.changeState = this.changeState.bind(this)

		this.character.velocitySimulator.mass = 1
		this.character.velocitySimulator.damping = 0.6

		this.character.setArcadeVelocityTarget(0.8)
		this.setAnimation('drop_running_roll', 0.03)
	}

	update(timeStep: number) {
		super.update(timeStep)

		this.character.setGlobalDirectionGoal()
		this.character.update(timeStep)

		if (this.animationEnded(timeStep)) {
			if (this.anyDirection()) {
				this.character.setState(Walk)
			} else {
				this.character.setState(EndWalk)
			}
		}
	}
}
