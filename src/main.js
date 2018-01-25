import { version, name } from '../package.json'
import { logs } from './scripts/utils'

/**
 * 读取键名
 * 如：对象object, 键名"a.b.c" 读取为 object[a][b][c]
 */
function readKeyValue (object, keyNames) {
	let target = object
  keyNames.split('.').forEach((keyName) => {
  	target = target[keyName]
  })
  return target
}

/**
 * 获取　Canvas
 */
function getCanvasElement(el) {
	let canvas = null
	if (typeof el === 'string') {
		canvas = document.getElementById(el)
	} else {
		canvas = el
	}
	if (!canvas || !canvas.getContext) {
		logs('error', 'Elements do not exist or browsers do not support!')
		return false;
	}
	return canvas
}

/**
 * 绘制圆点虚线
 */
function　dottedLine(ctx, x1, y1, x2, y2, interval) {
	if (!interval) {
		interval = 5
	}
	var isHorizontal = true
	if (x1 == x2) {
		isHorizontal = false
	}
	var len = isHorizontal ? x2 - x1 : y2 - y1
	ctx.moveTo(x1, y1)
	var progress = 0
	while (len > progress) {
		progress += interval
		if (progress > len) {
			progress = len
		}
		if (isHorizontal) {
			ctx.moveTo(x1 + progress, y1)
			ctx.arc(x1 + progress, y1, 1, 0, Math.PI * 2, true)
			ctx.fill()
		} else {
			ctx.moveTo(x1, y1 + progress)
			ctx.arc(x1, y1 + progress, 1, 0, Math.PI * 2, true)
			ctx.fill()
		}
	}
}

/**
 * 刻度线
 */
function drawScale(ctx, location, parames) {
	const { x, y, w, h } = location
	const { title, keyName, lineWidth, strokeStyle, fillStyle } = parames
	ctx.lineWidth = lineWidth
	ctx.strokeStyle = strokeStyle
	ctx.fillStyle = fillStyle
	ctx.beginPath()
	ctx.moveTo(x, y)
	ctx.lineTo(x + w, y)
	ctx.stroke()
  return function (data) {
		const XList = []
		const startY = y + lineWidth
		const surplusH = h - lineWidth
		const scaleHeight = surplusH * 0.3
		const fontSize = surplusH * 0.5
		const textTop = startY + scaleHeight + (surplusH * 0.2) + fontSize
	  const scaleCount = data.length
	  let span = w / (scaleCount + 1)
		let offsetLeft = x + span

		// 设置title
		ctx.lineWidth = lineWidth
		ctx.strokeStyle = strokeStyle
		ctx.fillStyle = fillStyle
		ctx.textAlign = 'left'
		ctx.font = fontSize + 'px Arial'
		ctx.fillText(title, x, textTop, span / 1.5)
		ctx.beginPath()
		data.forEach((item) => {
			const name = readKeyValue(item, keyName)
			ctx.moveTo(offsetLeft, startY)
			ctx.lineTo(offsetLeft, startY + scaleHeight)
			ctx.textAlign = 'center'
			ctx.font = fontSize + 'px Arial'
			ctx.fillText(name, offsetLeft, textTop, span * 0.8)
			XList.push({
				name,
				offsetLeft,
			})
			offsetLeft += span
		})
		ctx.stroke()
		return XList
  }
}

/**
 * 单张表中的图
 */
function singleChart(ctx, location, parames) {
	const { x, y, w, h } = location
	const { topShow, bottomShow } = parames
	const lineWidth = 1
	// 虚线行距
	let gridSpacingY = 40

  if (topShow || bottomShow) {
  	ctx.setLineDash([])
  	ctx.strokeStyle = '#000'
  	ctx.lineWidth = lineWidth
	  ctx.beginPath()
		// 顶部线条
	  if (topShow) {
		  ctx.moveTo(x, y + lineWidth)
		  ctx.lineTo(x + w, y + lineWidth)
	  }
		// 底部线条
	  if (bottomShow) {
		  ctx.moveTo(x, y + h - lineWidth)
		  ctx.lineTo(x + w, y + h - lineWidth)
	  }
	  ctx.stroke()
  }

  const gridCount = parseInt(h / gridSpacingY, 10)
  gridSpacingY += (h % gridSpacingY) / gridCount
  let gridTop = y
  ctx.beginPath()
  for (let i = 1; i < gridCount; i++) {
  	gridTop　+= gridSpacingY
  	ctx.strokeStyle = '#ccc'
  	// ctx.strokeStyle = '#eee'
  	// // 绘制圆点虚线
  	// dottedLine(ctx, x - 4, gridTop, x + w, gridTop, 8)

  	// 绘制方块虚线
  	ctx.setLineDash([5, 2, 25, 10])
  	ctx.moveTo(x, gridTop)
  	ctx.lineTo(x + w, gridTop)
  }
  ctx.stroke()
}

/**
 * 图表
 */
function drawTables(ctx, location, parames) {
	const { x, y, w, h } = location
	const { tables, offsetLeft, scaleTop } = parames
	const fontSize = 12
	const textWidth = offsetLeft * 0.8
	const tableHeight = h / tables.length
	ctx.textAlign = 'right'
	ctx.font = fontSize + 'px Arial'
	const lastBottomShow = scaleTop - (y + h) > h * 0.01
	tables.forEach(({ title, fillStyle }, index) => {
		const chartY = y + (tableHeight * index)
		const textY = (tableHeight + fontSize) / 2 + chartY
		ctx.fillStyle = fillStyle
		ctx.fillText(title, textWidth, textY, textWidth)
		singleChart(ctx, {
				x: offsetLeft,
				y: chartY,
				w: w - offsetLeft,
				h: tableHeight,
			}, {
				topShow: index === 0,
				bottomShow: index === tables.length - 1 ? lastBottomShow : true,
		})
	})
	return function (XList, data) {
		return tables.map((table, tableIndex) => {
			const {
				keyName, min, max, setPercentage, lineWidth,
				pointRadius, pointRadian, fillStyle, strokeStyle,
			} = table
			const chartY = y + (tableHeight * tableIndex)
			const difference = max - min
			ctx.setLineDash([])
	  	ctx.strokeStyle = strokeStyle
	  	ctx.fillStyle = fillStyle
	  	ctx.lineWidth = lineWidth

		  ctx.beginPath()
			const pointList = XList.map(({ name, offsetLeft }, xIndex) => {
				const x = offsetLeft
				let values = data[xIndex][keyName]
				const setLint = (value, index = 0) => {
					let percentage = setPercentage(value, difference, min)
					const y = chartY + tableHeight - (tableHeight * percentage)
					if (xIndex === 0 && index === 0) {
						ctx.moveTo(x, y)
					} else {
						ctx.lineTo(x, y)
					}
					return { y, percentage, value }
				}
				if (Array.isArray(values)) {
					values = values.map(setLint)
				} else if (typeof values === 'number') {
					values = setLint(values)
				} else {
					values = []
				}
				return { name, values, x }
			})
			ctx.stroke()
			
			// 设置圆点
			pointList.forEach(({ values, x }) => {
				values.forEach(({ y }) => {
				  ctx.beginPath()
					ctx.arc(x, y, pointRadius, 0, pointRadian, true)
					ctx.fill()
					ctx.stroke()
				})
			})
			return pointList
		})
	}
}

/**
 * 计算百分比
 */
function setPercentageDefault(value, difference, min) {
	return (value - min) / difference
}

class Xmany {
	constructor (el, config) {
		this.ctx = null
		this.options = null
		this.data = null
		this.scaleList = null
		this.pointAllList = null
		this.config = config
		this.canvas = getCanvasElement(el)
		this.initCanvas()
	}

	/**
	 * 初始化操作
	 */
	initCanvas () {
		const { width, height } = this.config 
		this.canvas.setAttribute('width', width) 
		this.canvas.setAttribute('height', height) 
		this.ctx = this.canvas.getContext('2d')
	}

	/**
	 * 设置默认值
	 */
	setOptions ({ scale = {}, chart = {}}) {
		const options = {}
		options.scale = (({
			title = '杆号', keyName　= 'pole.poleName', height = 30,
			lineWidth = 1, strokeStyle = '#000', fillStyle = '#000',
		}) => {
			return { title, keyName, height, lineWidth, strokeStyle, fillStyle }
		})(scale)
		options.chart = (({ offsetLeft = 100, tables = [], tablesHeight = 0 }) => {
			const newChart = {}
			newChart.offsetLeft = offsetLeft
			newChart.tables = tables.map(({
				title = '表名', keyName = '', min = 0, max = 100,
				setPercentage = null, pointRadius = 6, pointRadian = 360 * Math.PI / 180,
				fillStyle = '#000', strokeStyle = '#000', lineWidth = 1,
			}) => {
				return {
					title, keyName, lineWidth, min, max, pointRadius, pointRadian,
					setPercentage: setPercentage || setPercentageDefault,
					fillStyle, strokeStyle,
				}
			})
			return newChart
		})(chart)
		return this.options = options
	}

	draw (options, data) {
		this.setOptions(options)
		if (this.data) {
			this.clear()
		}
		this.data = data
		this.layout()
	}

	layout () {
		const { ctx, config, options, data } = this
		const { width, height } = config
		const { scale, chart } = options
		const { offsetLeft, tablesHeight, tables } = chart
		const scaleHeight = scale.height
		const scaleTop = height - scaleHeight
		this.scaleList = drawScale(ctx, {
				x: offsetLeft,
				y: height - scaleHeight,
				w: width - offsetLeft,
				h: scaleHeight,
			},
			scale,
		)(data)
		this.pointAllList = drawTables(ctx, {
				x: 0,
				y: 0,
				w: width - 0,
				h: tablesHeight || scaleTop,
			}, {
				offsetLeft,
				tables,
				scaleTop,
		})(this.scaleList, data)
		this.addEvent()
	}

	clear () {
		const ctx = this.ctx
		const { width, height } = this.config
		ctx.clearRect(0, 0, width, height)
	}

	addEvent () {
		const canvas = this.canvas
		const ctx = this.ctx
		const pointAllList = this.pointAllList
		const that = this
		canvas.addEventListener('mousemove', function(e){
			let pointCount = 0
			let pointTotal = 0
			pointAllList.forEach((pointList, tableIndex) => {
				pointList.forEach(({ values, x, name }) => {
					values.forEach(({ y }) => {
				  	if(that.inPointPath(x, y, e.offsetX, e.offsetY, tableIndex)) {
				    	canvas.style.cursor = 'pointer'
				    } else {
				    	pointCount++
				    }
				    pointTotal++
					})
				})
			})

			// 如果没有触发到任何一个点上
			if (pointCount === pointTotal) {
	    	canvas.style.cursor = 'default'
			}
		});
		
		canvas.addEventListener('mouseleave', function(){
			console.log('mouseleave')
		})
	}

  /**
   * 坐标是否在绘制的坐标点上
   * x1,y1 为点坐标位置
   * x2,y2 为事件位置参数
   */
  inPointPath (x1, y1, x2, y2, tableIndex) {
  	const ctx = this.ctx
  	const { pointRadius, pointRadian } = this.options.chart.tables[tableIndex]
  	ctx.beginPath()
  	ctx.moveTo(x1, y1)
  	ctx.arc(x1, y1, pointRadius, 0, pointRadian, true)
  	const ret = ctx.isPointInPath(x2, y2)
  	ctx.closePath()
  	return ret
  }

  /**
   * 坐标是否在 x 轴上
   * x1,y1 为点坐标位置
   * x2,y2 为事件位置参数
   */
  inAxisX (x1, y1, span, h, x2, y2, tableIndex) {
  	const ctx = this.ctx
  	ctx.beginPath()
  	ctx.strokeRect(x1 - (span / 2), y1, span, h)
  	const ret = ctx.isPointInPath(x2, y2)
  	ctx.closePath()
  	return ret
  }
}

Xmany.prototype.name = name
Xmany.prototype.version = version

export default Xmany
