import * as THREE from 'three'

export class CameraController {
	camera: THREE.PerspectiveCamera
	target: THREE.Vector3

	radius: number
	theta: number
	phi: number

	onMouseDownPosition: THREE.Vector2
	onMouseDownTheta: number
	onMouseDownPhi: number

	constructor(camera: THREE.PerspectiveCamera) {
		// bind functions
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseMove = this.onMouseMove.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.setRadius = this.setRadius.bind(this)
		this.update = this.update.bind(this)

		// init
		this.camera = camera
		this.target = new THREE.Vector3()

		this.radius = 3
		this.theta = 0
		this.phi = 0

		this.onMouseDownPosition = new THREE.Vector2()
		this.onMouseDownTheta = this.theta
		this.onMouseDownPhi = this.phi

		document.addEventListener('mousedown', this.onMouseDown, false)
	}

	onMouseDown(event: MouseEvent) {
		this.onMouseDownPosition = new THREE.Vector2(event.clientX, event.clientY)
		this.onMouseDownTheta = this.theta
		this.onMouseDownPhi = this.phi

		document.addEventListener('mousemove', this.onMouseMove, false)
		document.addEventListener('mouseup', this.onMouseUp, false)
	}

	onMouseMove(event: MouseEvent) {
		this.theta = -((event.clientX - this.onMouseDownPosition.x) * 0.5) + this.onMouseDownTheta
		this.phi = (event.clientY - this.onMouseDownPosition.y) * 0.5 + this.onMouseDownPhi
		this.phi = Math.min(179, Math.max(-179, this.phi))
	}

	onMouseUp(event: MouseEvent) {
		document.removeEventListener('mousemove', this.onMouseMove, false)
		document.removeEventListener('mouseup', this.onMouseUp, false)
	}

	setRadius(value: number) {
		this.radius = Math.max(0.001, value)
	}

	update() {
		this.camera.position.x =
			this.target.x + this.radius * Math.sin((this.theta * Math.PI) / 360) * Math.cos((this.phi * Math.PI) / 360)
		this.camera.position.y = this.target.y + this.radius * Math.sin((this.phi * Math.PI) / 360)
		this.camera.position.z =
			this.target.z + this.radius * Math.cos((this.theta * Math.PI) / 360) * Math.cos((this.phi * Math.PI) / 360)
		this.camera.updateMatrix()
		this.camera.lookAt(this.target)
	}
}
