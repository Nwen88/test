class Shape {
    constructor(canvas) {
        this.canvas = document.getElementById("canvas");
        this.context = this.canvas.getContext('2d');
        this.fontSize = 100;//字体大小
        this.dotGap = 15;//点间隙
    };
    resize() {
        var canvas = this.canvas;
        var context = this.context;
        //canvas宽高样式
        canvas.height = window.innerHeight;
        canvas.width = window.innerWidth;
        canvas.style.height = window.innerHeight;
        canvas.style.width = window.innerWidth;
        context.fillStyle = '#fff'; 
        context.textBaseline = 'middle'; //设置当前文本基线--方框的正中。
        context.textAlign = 'center'; //对齐方式 文本中心
    };
    genDotMap() {
        var canvas = this.canvas;
        var context = this.context;

        var data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        var dotc = [];
        var dotGap = this.dotGap;
        for (var y = 0; y < canvas.height; y += dotGap) {
            for (var x = 0; x < canvas.width; x += dotGap) {
                if (data[y * canvas.width * 4 + x * 4] != 0) {
                    dotc.push(new Point(x, y));
                }
            }
        }
        return dotc;
    };
    text(str) {
        var context = this.context;
        var canvas = this.canvas;

        var fontSize = this.fontSize;
        context.font = 'bold 30px sans-serif';
        var size = Math.min(0.22 * fontSize / context.measureText(str).width * canvas.width, 0.6 * canvas.height);
        context.font = 'bold ' + Math.floor(size) + 'px sans-serif'; //设置或返回文本内容的当前字体属性 
        context.clearRect(0, 0, canvas.width, canvas.height);//清空矩形内容。
        context.fillText(str,canvas.width / 2, canvas.height / 2);//字符串居中
    };
}
Shape.radius = 7; //半径


//绘制引擎 设置宽高 设置字体样式
class Engine extends Shape {

    constructor(canvas) {
        super(canvas)
        // canvas宽高
        this.canvas.height = window.innerHeight;
        this.canvas.width = window.innerWidth;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.context = this.canvas.getContext("2d");
        this.context.fillStyle = 'yellow';
        this.shapeFactory = new Shape();
        this.points = []; //存储像素数据
        this.shapeFactory.resize(); //字体样式

        window.addEventListener('resize', (e) => {
            this.canvas.height = window.innerHeight;
            this.canvas.width = window.innerWidth;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            // this.context.fillStyle = 'red';
            this.shapeFactory.resize();
        });
    }
    genText(text) {
        this.shapeFactory.text(text);//设置字符串样式并显示
        return this.shapeFactory.genDotMap(); //复制canvas像素进行处理
    };
    toText(text) {
        var points = this.genText(text); //获取canvas上的像素数据
        return this._toShape(points);
    };
    checkLife () {
        this.points = this.points.filter(function(point) {
            if (point.state === -1) {
                return false;
            } else {
                point.x = point.targetX;
                point.y = point.targetY;
                point.state = 0;
                return true;
            }
        });
    };
    shuffle () {
        var points = this.points;
        for (let i = points.length - 1; i > 0; i -= 1) {
            let j = Math.floor(Math.random() * (i + 1))
            let temp = points[i];
            points[i] = points[j];
            points[j] = temp;
        }
    }
    shake (time) {
        var promise = new Promise((resolve, reject) => {
            time = time || 500;
            var context = this.context;
            var width  = this.width;
            var height = this.height;
            var engine = this;
            var points = this.points;
    
            var totalProgress = 0.0;
            var step = 25 / time;
            var timer = setInterval(function(){
                if (totalProgress >= 1.0) {
                    clearInterval(timer);
                    timer = null;
                    totalProgress = 1.0;
                }
                context.clearRect(0, 0, width, height);
                points.forEach((point) => {
                    point.shake();//抖动
                    point.render(context);//描绘渲染
                });
                if (timer === null) {
                    engine.checkLife();
                    resolve();
                } else {
                    totalProgress += step;
                    if (totalProgress > 1.0) {
                        totalProgress = 1.0;
                    }
                }
            }, 50);
        });
        return promise;
    };
    _toShape(targets) {
        var promise = new Promise((resolve, reject) => {

            var context = this.context;

            var width = this.width;
            var height = this.height;
            var engine = this;
            var points = this.points;

            var len = Math.min(targets.length, points.length);
            for (let i = 0; i < len; i++) {
                points[i].targetX = targets[i].x;
                points[i].targetY = targets[i].y;
            }

            if (points.length > targets.length) {
                for (let i = len; i < points.length; i++) {
                    points[i].state = -1;
                    points[i].targetX = Math.random() * width;
                    points[i].targetY = Math.random() * height;
                }
            } else {
                for (let i = len; i < targets.length; i++) {
                    points.push(targets[i]);
                    targets[i].x = Math.random() * width;
                    targets[i].y = Math.random() * height;
                    points[i].state = 1;
                }
            }

            var totalProgress = 0.0;
            var timer = setInterval(function () {
                if (totalProgress >= 1.0) {
                    clearInterval(timer);
                    timer = null;
                    totalProgress = 1.0;
                }
                context.clearRect(0, 0, width, height);
                var progress = (2 - totalProgress) * totalProgress;

                points.forEach((point) => {
                    point.update(progress);
                    point.render(context);
                });
                if (timer === null) {
                    engine.checkLife();
                    engine.shuffle();
                    resolve();
                } else {
                    totalProgress += 0.02;
                    if (totalProgress > 1.0) {
                        totalProgress = 1.0;
                    }
                }
            }, 20);
        });
        return promise;
    }
};



//点
class Point extends Shape {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.targetX = x;//目标
        this.targetY = y;
        this.currentX = x;
        this.currentY = y; //当前
        this.state = 0;
        this.r = Shape.radius;
    };
    shake () {
        this.currentX = this.targetX + Math.random() * 2;
        this.currentY = this.targetY + Math.random() * 2;
    };
    clear () {
        return new Engine()._toShape([]);
    };
    update (ratio) {
        this.currentX = ratio * (this.targetX - this.x) + this.x;
        this.currentY = ratio * (this.targetY - this.y) + this.y;
        if (this.state === 0) {
        } else if (this.state === 1) {
            //逐渐显示
            this.r = ratio * Shape.radius;
        } else {
            //逐渐消失
            this.r = (1 - ratio) * Shape.radius;
        }
    };
    render (context) {
        context.beginPath();
        context.arc( this.currentX, this.currentY, this.r, 0, Math.PI * 0.5);
        context.closePath();
        context.fill();
    };

};