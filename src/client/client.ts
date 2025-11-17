import './css/main.css'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import _ from 'lodash'
import { World } from './ts/World'

import RAPIER from '@dimforge/rapier3d-compat'
import { FollowCharacter, Random } from './ts/Characters/CharacterAI'
import { Character } from './ts/Characters/Character'
await RAPIER.init()

THREE.Cache.enabled = true

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const controls = document.getElementById('controls') as HTMLDivElement
const controlsMain = document.getElementById('controls-main') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement

export default class AppClient {
	world: World

	constructor() {
		// bind function
		this.LoadExampleWorld = this.LoadExampleWorld.bind(this)
		this.LoadBoxmanCharacterModel = this.LoadBoxmanCharacterModel.bind(this)

		// Initialize sketchbook
		this.world = new World()

		// Load world geometry
		this.LoadExampleWorld()

		// Spawn player
		let player = this.world.SpawnCharacter()
		this.LoadBoxmanCharacterModel(player)
		player.Control()

		// Spawn Bob
		let bob = this.world.SpawnCharacter();
		this.LoadBoxmanCharacterModel(bob);
		bob.setBehaviour(new FollowCharacter(bob, player));

		// Spawn John
		let john = this.world.SpawnCharacter();
		this.LoadBoxmanCharacterModel(john);
		john.setBehaviour(new Random(john));
	}

	private LoadExampleWorld() {
		// Ground
		this.world.createBoxPrimitive({
			mass: 0,
			position: new RAPIER.Vector3(0, -1, 0),
			size: new RAPIER.Vector3(5, 1, 5),
			friction: 0.3,
		})

		// Stuff
		this.world.createBoxPrimitive({
			mass: 10,
			position: new RAPIER.Vector3(-4, 1, 0),
			size: new RAPIER.Vector3(1, 0.5, 4),
			friction: 0.3,
		})
		this.world.createBoxPrimitive({
			mass: 10,
			position: new RAPIER.Vector3(4, 2, 3),
			size: new RAPIER.Vector3(1, 2, 1),
			friction: 0.3,
		})

		//planks
		this.world.createBoxPrimitive({
			mass: 5,
			position: new RAPIER.Vector3(0, 5, 3),
			size: new RAPIER.Vector3(4, 0.02, 0.3),
			friction: 0.3,
		})
		this.world.createBoxPrimitive({
			mass: 5,
			position: new RAPIER.Vector3(-1, 3, -3),
			size: new RAPIER.Vector3(3, 0.02, 0.3),
			friction: 0.3,
		})
	}

	private LoadBoxmanCharacterModel(character: Character) {
		// Default model
		let fbxLoader = new FBXLoader()
		fbxLoader.load('./models/game_man.fbx', (object: THREE.Object3D) => {
			object.traverse((child: any) => {
				if (child.isMesh) {
					child.castShadow = true
					child.receiveShadow = true
				}
				if (child.name == 'game_man') {
					child.material = new THREE.MeshLambertMaterial({
						map: new THREE.TextureLoader().load('./models/game_man.png'),
						// skinning: true
					})
				}
			})

			character.setModel(object)
			character.setModelOffset(new THREE.Vector3(0, -0.1, 0))
		})
	}
}

new AppClient()
