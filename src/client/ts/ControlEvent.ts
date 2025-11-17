export class EventControl {
	value: boolean
	justPressed: boolean
	justReleased: boolean

	constructor() {
		this.value = false
		this.justPressed = false
		this.justReleased = false
	}
}

export class LerpControl {
	value: boolean
	floatValue: number

	constructor() {
		this.value = false
		this.floatValue = 0
	}
}
