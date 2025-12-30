(() => {
	const container = document.querySelector('.products')
	const result = document.querySelector('.calc__result')
	const orderTypes = ['purchase', 'gift']
	const cart = {
		products: {},
		services: {}
	}

	function createMarkup() {
		let template = calcData.products.map(({ name, quantity, options }, index) => `
			<div class="card" data-id="${index}" data-type="product">
				<button class="card__name card__name_product" type="button">${name}</button>
				<div class="card__details">
					${options ? `
						<select class="card__options select">
							${options.map(({ label }, idx) => `
								<option value="${idx}">${label}</option>
							`).join('')}
						</select>
					` : ''}
					<input class="card__quantity input" value="${quantity}" inputmode="numeric">
					<div class="card__discount-wrapper">
						<input class="card__discount input" placeholder="sale" inputmode="numeric">
						<select class="card__discount-type select">
							<option value="fixed">руб</option>
							<option value="percent">%</option>
						</select>
					</div>
				</div>
			</div>
		`).join('')

		template += calcData.services.map(({ name }, index) => `
			<div class="service card" data-id="${index}" data-type="service">
				<button class="card__name" type="button">${name}</button>
				<div class="card__details">
					<input class="card__price input" placeholder="цена" inputmode="numeric">
				</div>
			</div>
		`).join('')

		container.innerHTML = template
	}

	function attachListeners() {
		delegate(container, 'click', '.card__name', (e, target) => {
			cardToggle(target.closest('.card'))
		})

		container.querySelectorAll('.card__quantity').forEach(input => {
			input.addEventListener('focus', () => input.select())
			input.addEventListener('input', handleQuantityInput)
			input.addEventListener('blur', validateQuantity)
		})

		container.querySelectorAll('.card__discount').forEach(input => {
			input.addEventListener('focus', () => input.select())
			input.addEventListener('input', handleDiscountInput)
		})

		container.querySelectorAll('.card__options').forEach(select => {
			select.addEventListener('change', handleOptionsChange)
		})

		container.querySelectorAll('.card__discount-type').forEach(select => {
			select.addEventListener('change', handleDiscountTypeChange)
		})

		container.querySelectorAll('.card__price').forEach(input => {
			input.addEventListener('focus', () => input.select())
			input.addEventListener('input', handlePriceInput)
		})

		document.querySelector('.calc__reload').addEventListener('click', () => {
			location.reload()
		})

		document.querySelector('.calc__copy').addEventListener('click', copyResult)
	}

	function handleQuantityInput({ currentTarget }) {
		currentTarget.value = currentTarget.value.replace(/\D/g, '')
		updateCartQuantity(currentTarget)
	}

	function handleDiscountInput({ currentTarget }) {
		const { id, type } = getCardData(currentTarget)
		if (type !== 'product' || !cart.products[id]) return

		const discountType = currentTarget.closest('.card__details')
			.querySelector('.card__discount-type').value

		currentTarget.value = currentTarget.value.replace(/\D/g, '')
		const discountValue = +currentTarget.value || 0

		if (discountType === 'percent' && discountValue > 100) {
			currentTarget.value = '100'
			cart.products[id].discount = 100
		} else {
			cart.products[id].discount = discountValue
		}

		cart.products[id].discountType = discountType
		updateResult()
	}

	function handleOptionsChange({ currentTarget }) {
		const { id, type } = getCardData(currentTarget)
		if (type !== 'product' || !cart.products[id]) return

		cart.products[id].option = currentTarget.selectedIndex
		updateResult()
	}

	function handleDiscountTypeChange({ currentTarget }) {
		const { id, type } = getCardData(currentTarget)
		if (type !== 'product' || !cart.products[id]) return

		const discountInput = currentTarget.closest('.card__details')
			.querySelector('.card__discount')

		cart.products[id].discountType = currentTarget.value

		if (currentTarget.value === 'percent' && cart.products[id].discount > 100) {
			cart.products[id].discount = 0
			discountInput.value = ''
		}

		updateResult()
	}

	function handlePriceInput({ currentTarget }) {
		const { id, type } = getCardData(currentTarget)
		if (type !== 'service' || !cart.services[id]) return

		currentTarget.value = currentTarget.value.replace(/\D/g, '')
		cart.services[id].price = +currentTarget.value || 0
		updateResult()
	}

	function updateCartQuantity(input) {
		const { id, type } = getCardData(input)
		if (type !== 'product' || !cart.products[id]) return

		cart.products[id].quantity = +input.value || 0
		updateResult()
	}

	function validateQuantity({ currentTarget }) {
		const { id, type } = getCardData(currentTarget)
		if (type !== 'product') return

		const minQuantity = calcData.products[id].quantity

		if (+currentTarget.value < minQuantity) {
			currentTarget.value = minQuantity
			if (cart.products[id]) {
				cart.products[id].quantity = minQuantity
			}
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

	function cardToggle(cardEl) {
		const { id, type } = getCardData(cardEl)

		if (type === 'product') {
			toggleProduct(cardEl, id)
		} else if (type === 'service') {
			toggleService(cardEl, id)
		}

		updateResult()
	}

	function toggleProduct(cardEl, id) {
		if (cart.products[id]) {
			const newOrderType = getNextOrderType(cart.products[id].orderType)
			if (newOrderType) {
				cart.products[id].orderType = newOrderType
			} else {
				delete cart.products[id]
			}
		} else {
			addProductToCart(cardEl, id)
		}

		highlight(cardEl, cart.products[id]?.orderType)
	}

	function toggleService(cardEl, id) {
		if (cart.services[id]) {
			delete cart.services[id]
			highlight(cardEl, null)
		} else {
			addServiceToCart(cardEl, id)
			highlight(cardEl, 'purchase')
		}
	}

	function addProductToCart(cardEl, id) {
		const quantityEl = cardEl.querySelector('.card__quantity')
		const optionsEl = cardEl.querySelector('.card__options')
		const discountEl = cardEl.querySelector('.card__discount')
		const discountTypeEl = cardEl.querySelector('.card__discount-type')

		cart.products[id] = {
			orderType: orderTypes[0],
			quantity: +quantityEl.value || calcData.products[id].quantity,
			discount: +discountEl.value || 0,
			discountType: discountTypeEl.value
		}

		if (optionsEl) {
			cart.products[id].option = optionsEl.selectedIndex
		}
	}

	function addServiceToCart(cardEl, id) {
		const priceEl = cardEl.querySelector('.card__price')

		cart.services[id] = {
			price: +priceEl.value || 0
		}
	}

	function highlight(card, theme) {
		if (theme) {
			card.dataset.theme = theme
		} else {
			card.removeAttribute('data-theme')
		}
		card.classList.toggle('card_active', !!theme)
	}

	function getNextOrderType(current) {
		const orderTypeIndex = orderTypes.findIndex(v => v === current)
		return orderTypes[orderTypeIndex + 1]
	}

	function calculateDiscount(price, discount, discountType) {
		if (!discount) return { discountAmount: 0, finalPrice: price }

		let discountAmount
		if (discountType === 'percent') {
			discountAmount = Math.round(price * discount / 100)
		} else {
			discountAmount = Math.min(discount, price)
		}

		return {
			discountAmount,
			finalPrice: price - discountAmount
		}
	}

	function formatProduct(product, productData) {
		const name = '- ' + productData.name
		const quantity = product.quantity > 1 ? ` ${product.quantity}шт.` : ''
		let optionLabel = ''

		if (product.hasOwnProperty('option')) {
			optionLabel = ` (${productData.options[product.option].label})`
		}

		if (product.orderType === 'gift') {
			return `${name}${optionLabel}:${quantity} в подарок 🎁\n`
		}

		const priceSingle = product.hasOwnProperty('option')
			? productData.options[product.option].price
			: productData.price

		const priceTotal = priceSingle * product.quantity
		const { discountAmount, finalPrice } = calculateDiscount(
			priceTotal,
			product.discount,
			product.discountType
		)

		let priceStr = ''
		if (product.quantity > 1) {
			priceStr = `${quantity} × ${priceSingle} руб`
		} else {
			priceStr = `${priceSingle} руб`
		}

		if (discountAmount > 0) {
			const discountLabel = product.discountType === 'percent'
				? `${product.discount}%`
				: `${discountAmount} руб`
			return `${name}${optionLabel}: ${priceStr} - ${discountLabel} (скидка) = ${finalPrice} руб\n`
		}

		if (product.quantity > 1) {
			return `${name}${optionLabel}: ${priceStr} = ${priceTotal} руб\n`
		}

		return `${name}${optionLabel}: ${priceStr}\n`
	}

	function formatService(service, serviceData) {
		const name = '- ' + serviceData.name
		return `${name}: ${service.price} руб\n`
	}

	function updateResult() {
		let str = ''
		let productsSum = 0
		let servicesSum = 0

		// Обработка продуктов
		const productsArr = Object.entries(cart.products).map(([id, value]) => ({ id, ...value }))

		if (productsArr.length) {
			productsArr.sort((a, b) => {
				if (a.orderType === 'gift' && b.orderType !== 'gift') return 1
				if (a.orderType !== 'gift' && b.orderType === 'gift') return -1
				return +a.id - +b.id
			})

			productsArr.forEach(product => {
				const productData = calcData.products[product.id]
				str += formatProduct(product, productData)

				if (product.orderType !== 'gift') {
					const priceSingle = product.hasOwnProperty('option')
						? productData.options[product.option].price
						: productData.price

					const priceTotal = priceSingle * product.quantity
					const { finalPrice } = calculateDiscount(
						priceTotal,
						product.discount,
						product.discountType
					)

					productsSum += finalPrice
				}
			})

			if (productsSum > 0) {
				str += `\nСумма заказа: ${productsSum} руб\n\n`
			}
		}

		// Обработка услуг
		const servicesArr = Object.entries(cart.services).map(([id, value]) => ({ id, ...value }))

		if (servicesArr.length) {
			servicesArr.sort((a, b) => +a.id - +b.id)

			servicesArr.forEach(service => {
				const serviceData = calcData.services[service.id]
				str += formatService(service, serviceData)
				servicesSum += service.price
			})
		}

		// Итоговая сумма
		const totalSum = productsSum + servicesSum
		if (totalSum > 0 && servicesSum > 0) {
			str += `\nИтого: ${totalSum} руб`
		}

		result.innerHTML = str
	}

	function getCardData(el) {
		const card = el.closest('.card')
		return {
			id: card.dataset.id,
			type: card.dataset.type
		}
	}

	function copyResult({ currentTarget }) {
		navigator.clipboard.writeText(result.textContent)
		currentTarget.textContent = 'Скопировано!'
		setTimeout(() => currentTarget.textContent = 'Скопировать заказ', 1000)
	}

	createMarkup()
	attachListeners()
})()