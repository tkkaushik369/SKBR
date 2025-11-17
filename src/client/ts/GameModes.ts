import * as THREE from 'three'
import { LerpControl } from './ControlEvent'
import { Character } from './Characters/Character'
import { World } from './World'

/**
 * Free camera game mode.
 * @param {Character} character Character to control
 */

export class FreeCameraControls {
	world: World
	camera: THREE.PerspectiveCamera
	previousGameMode: FreeCameraControls | CharacterControls
	movementSpeed: number

	keymap: { [id: string]: { action: string } }
	controls: { [id: string]: LerpControl }

	constructor(world: World) {
		this.world = world
		this.camera = world.camera
		this.previousGameMode = world.gameMode
		this.movementSpeed = 0.06

		this.init()

		// Keymap
		this.keymap = {
			w: { action: 'forward' },
			s: { action: 'back' },
			a: { action: 'left' },
			d: { action: 'right' },
			e: { action: 'up' },
			q: { action: 'down' },
			shift: { action: 'fast' },
		}

		this.controls = {
			forward: new LerpControl(),
			left: new LerpControl(),
			right: new LerpControl(),
			up: new LerpControl(),
			back: new LerpControl(),
			down: new LerpControl(),
			fast: new LerpControl(),
		}
	}

	init() {
		this.world.cameraController.target.copy(this.world.camera.position)
		this.world.cameraController.setRadius(0)
	}

	/**
	 * Handles game actions based on supplied inputs.
	 * @param {*} event Keyboard or mouse event
	 * @param {char} key Key or button pressed
	 * @param {boolean} value Value to be assigned to action
	 */
	handleKey(event: KeyboardEvent | MouseEvent, key: string, value: boolean) {
		// Shift modifier fix
		key = key.toLowerCase()

		// Turn off free cam
		if (this.previousGameMode != undefined && key == 'c' && value == true && event.shiftKey == true) {
			this.world.gameMode = this.previousGameMode
			this.world.gameMode.init()
		}
		// Is key bound to action
		else if (key in this.keymap) {
			// Get action and set it's parameters
			let action = this.controls[this.keymap[key].action]
			action.value = value
		}
	}

	update() {
		// Make light follow camera (for shadows)

		for (let key in this.controls) {
			let ctrl = this.controls[key]
			ctrl.floatValue = THREE.MathUtils.lerp(ctrl.floatValue, +ctrl.value, 0.3)
		}

		let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
		let back = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion)
		let left = new THREE.Vector3(-1, 0, 0).applyQuaternion(this.camera.quaternion)
		let right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion)
		let up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion)
		let down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.camera.quaternion)

		let speed = this.movementSpeed * (this.controls.fast.value ? 5 : 1)

		this.world.cameraController.target.add(forward.multiplyScalar(speed * this.controls.forward.floatValue))
		this.world.cameraController.target.add(back.multiplyScalar(speed * this.controls.back.floatValue))
		this.world.cameraController.target.add(left.multiplyScalar(speed * this.controls.left.floatValue))
		this.world.cameraController.target.add(right.multiplyScalar(speed * this.controls.right.floatValue))
		this.world.cameraController.target.add(up.multiplyScalar(speed * this.controls.up.floatValue))
		this.world.cameraController.target.add(down.multiplyScalar(speed * this.controls.down.floatValue))
	}
}

/**
 * Character controls game mode. Allows player to control a character.
 * @param {Character} character Character to control
 */
export class CharacterControls {
	world: World
	character: Character
	keymap: { [id: string]: { action: string } }

	constructor(world: World, character: Character) {
		this.world = world
		this.character = character

		this.init()

		// Keymap
		this.keymap = {
			w: { action: 'up' },
			s: { action: 'down' },
			a: { action: 'left' },
			d: { action: 'right' },
			shift: { action: 'run' },
			' ': { action: 'jump' },
			e: { action: 'use' },
			mouse0: { action: 'primary' },
			mouse2: { action: 'secondary' },
			mouse1: { action: 'tertiary' },
		}
	}

	init() {
		this.world.cameraController.setRadius(1.8)
	}

	/**
	 * Handles game actions based on supplied inputs.
	 * @param {*} event Keyboard or mouse event
	 * @param {char} key Key or button pressed
	 * @param {boolean} value Value to be assigned to action
	 */
	handleKey(event: KeyboardEvent | MouseEvent, key: string, value: boolean) {
		// Shift modifier fix
		key = key.toLowerCase()

		//Free cam
		if (key == 'c' && value == true && event.shiftKey == true) {
			this.character.resetControls()
			this.world.gameMode = new FreeCameraControls(this.world)
		}
		// Is key bound to action
		if (key in this.keymap) {
			this.character.setControl(this.keymap[key].action, value)
		}
	}

	update() {
		// Look in camera's direction
		this.character.viewVector = new THREE.Vector3().subVectors(this.character.position, this.world.camera.position)

		// Position camera
		this.world.cameraController.target.copy(
			new THREE.Vector3(
				this.character.position.x,
				this.character.position.y + this.character.height / 1.7,
				this.character.position.z
			)
		)
	}
}
