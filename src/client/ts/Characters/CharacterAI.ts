import * as THREE from 'three'
import { Character } from './Character'

export class Default {
	character: Character

	constructor(character: Character) {
		// bind function
		this.update = this.update.bind(this)

		// init
		this.character = character
	}

	update(timeStep: number) {
		this.character.charState.update(timeStep)
	}
}

export class FollowCharacter extends Default {
	targetCharacter: Character
	stopDistance: number

	constructor(character: Character, targetCharacter: Character, stopDistance = 1.3) {
		super(character)
		// bind function
		this.update = this.update.bind(this)

		// init
		this.targetCharacter = targetCharacter
		this.stopDistance = stopDistance
	}

	update(timeStep: number) {
		super.update(timeStep)
		let viewVector = new THREE.Vector3().subVectors(this.targetCharacter.position, this.character.position)
		this.character.setViewVector(viewVector)

		// Follow character
		if (viewVector.length() > this.stopDistance) {
			if (!this.character.controls.up.value) this.character.setControl('up', true)
		}
		//Stand still
		else {
			if (this.character.controls.up.value) this.character.setControl('up', false)

			// Look at character
			this.character.setOrientationTarget(viewVector)
		}
	}
}

export class Random extends Default {
	randomFrequency: number

	constructor(character: Character, randomFrequency = 100) {
		super(character)
		// bind function
		this.update = this.update.bind(this)

		// init
		this.randomFrequency = randomFrequency
	}

	update(timeStep: number) {
		super.update(timeStep)
		let rndInt = Math.floor(Math.random() * this.randomFrequency)
		let rndBool = Math.random() > 0.5 ? true : false

		if (rndInt == 0) {
			this.character.setViewVector(
				new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
			)
			// this.character.setOrientationTarget(this.character.viewVector);

			this.character.setControl('up', true)
			this.character.charState.update(timeStep)
			this.character.setControl('up', false)
		} else if (rndInt == 1) {
			this.character.setControl('up', rndBool)
		} else if (rndInt == 2) {
			this.character.setControl('run', rndBool)
		} else if (rndInt == 3) {
			this.character.setControl('jump', rndBool)
		}
	}
}
