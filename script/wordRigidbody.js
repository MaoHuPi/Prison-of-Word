class WordRigidbodyPool {
	constructor({ cvs, ctx, width, height }) {
		this.cvs = cvs;
		this.ctx = ctx;
		this.width = width;
		this.height = height;
		this.wordList = [];
		this.lastTime = performance.now();
	}
	create(property) {
		let word = new WordRigidbody({ ...property, pool: this });
		this.wordList.push(word);
	}
	update() {
		let currentTime = performance.now();
		let deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
		this.lastTime = currentTime;
		for (let a of this.wordList) {
			// 重置角加速度
			a.alpha = 0;
			// 重力
			a.ax = 0;
			a.ay = 500;
			// 碰撞正向力
			for (let b of this.wordList) {
				if (a !== b) {
					if (this.isOverlap(a, b)) {
						let vectorBA = [a.x - b.x, a.y - b.y];
						let lengthBA = Math.sqrt(vectorBA[0] ** 2 + vectorBA[1] ** 2);
						a.ax += vectorBA[0] / (lengthBA ** 3) * 1e6;
						a.ay += vectorBA[1] / (lengthBA ** 3) * 1e6;
						// 動能減損
						a.vx *= 0.5;
						a.vy *= 0.5;
						// 旋轉
						a.alpha -= ((-vectorBA[0]) * b.vy - (-vectorBA[1] * b.vx)) / (lengthBA ** 3) * 2e3;
						a.omega *= 0.5;
					}
				}
			}
			// 空氣阻力
			a.ax -= a.vx * 0.5;
			a.ay -= a.vy * 0.5;
			// 地面、牆面正向力
			let touchWall = false;
			if (a.x + a.size / 2 > this.width) {
				a.ax -= (a.x + a.size / 2 - this.width) ** 2 * 1e2;
				a.vx *= 0.5;
				touchWall = true;
			}
			if (a.x - a.size / 2 < 0) {
				a.ax += (-(a.x - a.size / 2)) ** 2 * 1e2;
				a.vx *= 0.5;
				touchWall = true;
			}
			if (a.y + a.size / 2 > this.height) {
				a.ay -= (a.y + a.size / 2 - this.height) ** 2 * 1e2;
				a.vy *= 0.5;
				touchWall = true;
			}
			if (a.y - a.size / 2 < 0) {
				a.ay += (-(a.y - a.size / 2)) ** 2 * 1e2;
				a.vy *= 0.5;
				touchWall = true;
			}
			if (touchWall) {
				a.alpha += (Math.round(a.theta / (Math.PI / 2)) * (Math.PI / 2) - a.theta) * 10;
				a.omega *= 0.5;
			}
		}
		this.ctx.save();
		this.ctx.fillStyle = 'white';
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';
		for (let i = 0; i < this.wordList.length; i++) {
			let word = this.wordList[i];
			word.update(deltaTime);
			if (word.aliveTime <= 0 || !Number.isFinite(word.x) || !Number.isFinite(word.y)) {
				this.wordList.splice(i, 1);
				i--;
			} else {
				word.draw();
			}
		}
		this.ctx.restore();
	}
	isOverlap(a, b) {
		let sin = Math.sin(b.theta);
		let cos = Math.cos(b.theta);
		return a.getColliderBox()
			.map(([x, y]) => [x - b.x, y - b.y])
			.map(([x, y]) => [-x * cos + y * sin, x * sin + y * cos])
			.filter(([x, y]) => Math.abs(x) <= b.size / 2 && Math.abs(y) <= b.size / 2)
			.length > 0;
	}
}
class WordRigidbody {
	constructor({
		x, y, text, size = 30,
		vx = 0, vy = 0,
		ax = 0, ay = 0,
		theta = 0, omega = 0, alpha = 0,
		pool, aliveTime = 10
	}) {
		this.x = x;
		this.y = y;
		this.vx = vx;
		this.vy = vy;
		this.ax = ax;
		this.ay = ay;
		this.theta = theta;
		this.omega = omega;
		this.alpha = alpha;
		this.text = text;
		this.size = size;
		this.pool = pool;
		this.aliveTime = aliveTime;
	}
	update(deltaTime) {
		this.vx += this.ax * deltaTime;
		this.vy += this.ay * deltaTime;
		this.x += this.vx * deltaTime;
		this.y += this.vy * deltaTime;
		this.omega += this.alpha * deltaTime;
		this.theta += this.omega * deltaTime;
		this.aliveTime -= deltaTime;
	}
	draw() {
		this.pool.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(Math.min(this.aliveTime, 1), 0)})`;
		this.pool.ctx.font = `${this.size}px Zpix`;
		this.pool.ctx.translate(this.x, this.y);
		this.pool.ctx.rotate(-this.theta);
		this.pool.ctx.fillText(this.text, 0, 0);
		this.pool.ctx.rotate(this.theta);
		this.pool.ctx.translate(-this.x, -this.y);
	}
	getColliderBox() {
		let sin = Math.sin(this.theta);
		let cos = Math.cos(this.theta);
		return [
			[-this.size / 2, -this.size / 2],
			[+this.size / 2, -this.size / 2],
			[+this.size / 2, +this.size / 2],
			[-this.size / 2, +this.size / 2]
		]
			.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos])
			.map(([x, y]) => [x + this.x, y + this.y]);
	}
}