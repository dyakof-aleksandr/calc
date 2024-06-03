(() => {
	const products = document.querySelector('.products')
	const result = document.querySelector('.calc__result')
	const orderTypes = ['purchase', 'gift']
	const cart = {}

	function createMarkup() {
		products.innerHTML = calcData.map(({ name, quantity, options }, index) => `
			<div class="product" data-id="${index}">
				<div class="product__name">${name}</div>
				${options ? `
					<select class="product__options select">
						${options.map(({ label }, index) => `
							<option value="${index}">${label}</option>
						`).join('')}
					</select>
				` : ''}
				<input class="product__quantity input" value="${quantity}">
			</div>
		`).join('')
	}

	function attachListeners() {
		delegate(products, 'click', '.product__name', (e, target) => {
			productToggle(target.closest('.product'))
		})

		products.querySelectorAll('.product__quantity').forEach(input => {
			input.addEventListener('focus', input.select)
			input.addEventListener('input', changeQuantity)
			input.addEventListener('blur', validateQuantity)
		})

		products.querySelectorAll('.product__options').forEach(select => {
			select.addEventListener('change', changeOptions)
		})

		document.querySelector('.calc__reload').addEventListener('click', () => {
			location.reload()
		})

		document.querySelector('.calc__copy').addEventListener('click', copyResult)
	}

	function changeOptions({ currentTarget }) {
		const id = getProductId(currentTarget)

		if (!cart[id]) return

		cart[id].option = currentTarget.selectedIndex
		updateResult()
	}

	function changeQuantity({ currentTarget }) {
		currentTarget.value = currentTarget.value.replace(/\D/g, '')

		const id = getProductId(currentTarget)

		if (!cart[id]) return

		cart[id].quantity = +currentTarget.value
		updateResult()
	}

	function validateQuantity({ currentTarget }) {
		const id = getProductId(currentTarget)

		if (+currentTarget.value < calcData[id].quantity) {
			currentTarget.value = calcData[id].quantity
			updateResult()
		}
	}

	function delegate(element, eventName, selector, handler) {
		element.addEventListener(eventName, (event) => {
			const targetElement = event.target.closest(selector)
			if (targetElement) {
				handler(event, targetElement)
			}
		})
	}

	function productToggle(productEl) {
		const id = productEl.dataset.id

		if (cart[id]) {
			const newOrderType = getNextOrderType(cart[id].orderType)

			newOrderType ? changeOrderType(id, newOrderType) : removeFromCart(id)
		} else {
			addToCard(productEl)
		}

		highlight(productEl, cart[id]?.orderType)
		updateResult()
	}

	function addToCard(productEl) {
		const quantityEl = productEl.querySelector('.product__quantity')
		const options = productEl.querySelector('.product__options')

		cart[productEl.dataset.id] = {
			orderType: orderTypes[0],
			quantity: +quantityEl.value
		}

		if (options) {
			cart[productEl.dataset.id].option = options.selectedIndex
		}
	}

	function removeFromCart(id) {
		delete cart[id]
	}

	function changeOrderType(id, orderType) {
		cart[id].orderType = orderType
	}

	function highlight(productEl, theme) {
		if (theme) {
			productEl.dataset.theme = theme
		} else {
			productEl.removeAttribute('data-theme')
		}
	}

	function getNextOrderType(current) {
		const orderTypeIndex = orderTypes.findIndex(v => v === current)

		return orderTypes[orderTypeIndex + 1]
	}

	function updateResult() {
		let str = ''
		let sum = 0
		const cartArr = Object.entries(cart).map(([id, value]) => ({ id, ...value }))

		if (cartArr.length) {
			cartArr.sort((a, b) => {
				if (a.orderType === 'gift' && b.orderType !== 'gift') {
					return 1
				}
				if (a.orderType !== 'gift' && b.orderType === 'gift') {
					return -1
				}

				return a.position - b.position
			})

			cartArr.forEach(product => {
				const productData = calcData[product.id]
				const name = '- ' + productData.name
				const quantity = product.quantity > 1 ? ` ${product.quantity}шт.` : ''
				let priceSingleValue
				let priceTotalValue
				let priceTotalStr
				let optionLabel = ''

				if (product.hasOwnProperty('option')) {
					optionLabel = ` (${productData.options[product.option].label})`
				}

				if (product.orderType === 'gift') {
					str += `${name}${optionLabel}:${quantity} в подарок 🎁\n`
				} else {
					if (product.hasOwnProperty('option')) {
						priceSingleValue = productData.options[product.option].price
					} else {
						priceSingleValue = productData.price
					}

					priceTotalValue = priceSingleValue * product.quantity
					priceTotalStr = (product.quantity > 1 ? ` = ${priceTotalValue} руб` : '')

					sum += priceTotalValue
					str += `${name}${optionLabel}:${quantity && `${quantity} ×`} ${priceSingleValue} руб${priceTotalStr}\n`
				}


			})

			if (sum > 0) str += `\nСумма заказа: ${sum} руб`
		}

		result.innerHTML = str
	}

	function getProductId(el) {
		return el.closest('.product').dataset.id
	}

	function copyResult({ currentTarget }) {
		navigator.clipboard.writeText(result.innerHTML)
		currentTarget.textContent = 'Скопировано!'
		setTimeout(() => currentTarget.textContent = 'Скопировать заказ', 1000)
	}

	createMarkup()
	attachListeners()
})()