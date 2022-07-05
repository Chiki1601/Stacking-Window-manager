const Theme = {
    TitleBackgroundActive: 'mediumblue',
    TitleForegroundActive: 'white',

    TitleBackgroundInactive: 'darkgrey',
    TitleForegroundInactive: 'black',
    
    BorderActive: 'black',
    BorderInactive: 'grey',

    ClientAreaBackground: 'white',
    TitleHeight: 30,

    CanvasBackdrop: '#EEEEEE',

    MinWindowWidth: 200,
    MinWindowHeight: 100,

    FontTitle: '18px serif',
    FontCloseButton: '16px sans-serif'
}

class Window {
    constructor(title, left, top, width, height, paintCallback) {
        this.title = title;
        
        this.left = left;
        this.top = top;

        this.width = width;
        this.height = height;

        this.paintCallback = paintCallback;
        this.active = false;
    }

    paint(ctx) {
        this.paintTitle(ctx);
        this.paintCloseButton(ctx);
        this.paintClientArea(ctx);
    }

    paintTitle(ctx) {
        ctx.beginPath();

        ctx.fillStyle = this.active ? Theme.TitleBackgroundActive : Theme.TitleBackgroundInactive;
        ctx.strokeStyle = this.active ? Theme.BorderActive : Theme.BorderInactive;

        ctx.fillRect(0, 0, this.width, Theme.TitleHeight);
        ctx.strokeRect(0, 0, this.width, Theme.TitleHeight);


        ctx.fillStyle = this.active ? Theme.TitleForegroundActive : Theme.TitleForegroundInactive;

        ctx.font = Theme.FontTitle;
        ctx.textBaseline = "middle";

        ctx.fillText(this.title, 5, Math.round(Theme.TitleHeight / 2));
    }

    paintCloseButton(ctx) {
        ctx.beginPath();

        ctx.font = Theme.FontCloseButton;
        ctx.textBaseline = "middle";

        ctx.fillText("X", this.width - 25, Math.round(Theme.TitleHeight / 2));
    }

    paintClientArea(ctx) {
        ctx.beginPath();

        let clientArea = new Area(this.width, this.height - Theme.TitleHeight);

        ctx.fillStyle = Theme.ClientAreaBackground;
        ctx.fillRect(0, Theme.TitleHeight, clientArea.width, clientArea.height);

        if(this.paintCallback) {
            // translate the context, so the paint callback sees upper-left-corner = (0, 0)
            ctx.save();
            ctx.translate(0, Theme.TitleHeight);


            // also clip the context, so the callback cannot paint outside of the client area
            ctx.beginPath();

            ctx.rect(0, 0, clientArea.width, clientArea.height);
            ctx.clip();


            // let the callback do its painting
            this.paintCallback(this, ctx, clientArea);

            // and restore the context
            ctx.restore();
        }


        ctx.beginPath();

        ctx.strokeStyle = this.active ? Theme.BorderActive : this.BorderInactive;
        ctx.strokeRect(0, Theme.TitleHeight, clientArea.width, clientArea.height);
    }

    hitTest(x, y) {
        let d = 4;
        let dN = Math.abs(y);
        let dE = Math.abs(x - this.width);
        let dS = Math.abs(y - this.height);
        let dW = Math.abs(x);

        if(dN < d && dE < d) {
            return "NE-corner";
        }

        if(dE < d && dS < d) {
            return "SE-corner";
        }

        if(dW < d && dS < d) {
            return "SW-corner";
        }

        if(dN < d && dW < d) {
            return "NW-corner";
        }

        if(dN < d) {
            return "N-border";
        }

        if(dE < d) {
            return "E-border";
        }

        if(dS < d) {
            return "S-border";
        }

        if(dW < d) {
            return "W-border";
        }

        

        if(x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return "";
        }

        if(x > this.width - 25 && y < Theme.TitleHeight) {
            return "close-button";
        }

        if(y < Theme.TitleHeight) {
            return "title";
        }

        return "client-area";
    }

}

class WindowManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.counter = 1;

        this.windows = [];
        this.clickInfo = null;

        canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        canvas.addEventListener('mouseleave', e => this.onMouseLeave(e));
    }

    addWindow(title, width, height, paintCallback) {
        title = title || `Window ${this.counter++}`;

        width = width || random(300, 500);
        height = height || random(150, 300);

        let left = random(0, this.canvas.width - width);
        let top = random(0, this.canvas.height - height);

        let wnd = new Window(title, left, top, width, height, paintCallback);

        this.windows.push(wnd);
        this.activateWindow(wnd);
    }

    closeWindow(wnd) {
        let {windows} = this;
        let i = windows.findIndex(w => w === wnd);

        windows.splice(i, 1);

        if(wnd.active && windows.length > 0) {
            windows[windows.length - 1].active = true;
        }
    }

    activateWindow(wnd) {
        if(wnd.active) {
            return;
        }

        let {windows} = this;
        let i = windows.findIndex(w => w === wnd);

        windows.splice(i, 1);
        windows.forEach(w => w.active = false);

        wnd.active = true;
        windows.push(wnd);
    }

    paint() {
        let ctx = this.canvas.getContext('2d');

        ctx.beginPath();
        ctx.fillStyle = Theme.CanvasBackdrop;

        ctx.fillRect(0, 0, canvas.width, canvas.height);


        this.windows.forEach(w => {
            // translate the context relative to the window,
            // so each window can paint itself in terms of top-left-corner = (0, 0)

            ctx.save();
            ctx.translate(w.left, w.top);
            

            // also clip the context, so a window cannot paint outside its own area
            ctx.beginPath();

            ctx.rect(0, 0, w.width, w.height);
            ctx.clip();


            // now let the window paint itself
            w.paint(ctx);

            // and restore the context
            ctx.restore();
        });
    }

    onMouseDown(e) { 
        if(e.button != 0) {
            return;
        }

        let [wnd, hit] = this.getWindowUnderMouse(e);

        if(!wnd) {
            return;
        }
       
        this.clickInfo = {
            window: wnd,
            x: e.offsetX,
            y: e.offsetY,
            hitZone: hit,
            dragging: false
        };
    }

    onMouseUp(e) {
        if(!this.clickInfo) {
            return;
        }

        let {window} = this.clickInfo;

        switch(this.clickInfo.hitZone) {
            case "close-button":
                this.closeWindow(window);
                this.canvas.style.cursor = "default";
                break;

            default:
                this.activateWindow(window);
                break;
        }

        
        this.clickInfo = null;
    }

    onMouseMove(e) {
        if(this.clickInfo) {
            this.onMouseDrag(e);
            return;
        }


        let [wnd, hit] = this.getWindowUnderMouse(e);
        let cursor = "default";

        if(!wnd) {
            this.canvas.style.cursor = cursor;
            return;
        }

        switch(hit) {
            case "N-border":
            case "S-border":
                cursor = "ns-resize";
                break;

            case "NE-corner":
            case "SW-corner":
                cursor = "ne-resize";
                break;

            case "E-border":
            case "W-border":
                cursor = "ew-resize";
                break;

            case "NW-corner":
            case "SE-corner":
                cursor = "se-resize";
                break;

            case "close-button":
                cursor = "pointer";
                break;

            case "title":
                cursor = "move";
        }

        this.canvas.style.cursor = cursor;
    }

    onMouseDrag(e) {
        let {clickInfo} = this;

        let dx = e.offsetX - clickInfo.x;
        let dy = e.offsetY - clickInfo.y;

        let {window} = clickInfo;
        let {hitZone} = clickInfo;

        if(!clickInfo.dragging) {

            // do not start the drag operation immediately, wait for a movement at least 5 pixels in any direction
            if( Math.abs(dx) < 5 && Math.abs(dy) < 5 ) {
                return;
            }

            clickInfo.dragging = true;
            this.activateWindow(window);
        }

        if(hitZone === "title") {
            window.left += dx;
            window.top += dy;
        }

        if(hitZone.includes("N") && window.height - dy >= Theme.MinWindowHeight) {
            window.top += dy;
            window.height -= dy;
        }

        if(hitZone.includes("E") && window.width + dx >= Theme.MinWindowWidth) {
            window.width += dx;
        }

        if(hitZone.includes("S") && window.height + dy >= Theme.MinWindowHeight) {
            window.height += dy;
        }

        if(hitZone.includes("W") && window.width - dx >= Theme.MinWindowWidth) {
            window.left += dx;
            window.width -= dx;
        }


        clickInfo.x = e.offsetX;
        clickInfo.y = e.offsetY;
    }

    onMouseLeave(e) {
        this.clickInfo = null;
    }

    getWindowUnderMouse(e) {
        let hit = null;

        let wnd = this.windows.slice().reverse().find(w => {
            hit = w.hitTest(e.offsetX - w.left, e.offsetY - w.top);

            if(hit) {
                return true;
            }
        });

        return [wnd, hit];
    }
}

class Area {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
}


window.onload = () => {
    let canvas = document.getElementById('canvas');

    let wndMgr = new WindowManager(canvas);
    window.WndMgr = wndMgr;

    wndMgr.addWindow(null, 0, 0, paintBouncingBalls);
    wndMgr.addWindow(null, 0, 0, paintBouncingBalls);
    wndMgr.addWindow(null, 0, 0, paintBouncingBalls);

    setInterval(() => wndMgr.paint(), 25);
}


/*
    Example window paint function, which creates a random number of balls,
    and bounces them around using random horizontal/vertical speeds.
    The balls have random radiuses, random colors, and are created at random coordinates.

    The top-left coordinates as seen by the function are (0, 0) -- due to canvas translations explained above.
    Also the function cannot paint outside of the client area -- due to canvas clipping explained above.
*/
function paintBouncingBalls(wnd, ctx, clientArea) {
    if(!wnd.balls) {
        wnd.balls = createBalls(clientArea);
    }

    wnd.balls.forEach(ball => calcBallPosition(ball, clientArea));
    wnd.balls.forEach(ball => paintBall(ball, ctx));


    function createBalls({width, height}) {
        let n = random(3, 10);
        let balls = [];

        for(let i = 0; i < n; i++) {
            let radius = random(10, 30);

            let ball = {
                radius: radius,

                x: random(radius, width - radius),
                y: random(radius, height - radius),

                speedX: random(2, 10),
                speedY: random(2, 10),

                color: random(0, 360)
            };

            balls.push(ball);
        }
        
        return balls;
    }

    function calcBallPosition(ball, clientArea) {
        let {width, height} = clientArea;

        ball.x += ball.speedX;
        ball.y += ball.speedY;


        if(ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.speedX = -ball.speedX;
        }

        if(ball.x + ball.radius > width) {
            ball.x = width - ball.radius;
            ball.speedX = -ball.speedX;
        }


        if(ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.speedY = -ball.speedY;
        }

        if(ball.y + ball.radius > height) {
            ball.y = height - ball.radius;
            ball.speedY = -ball.speedY;
        }
    }

    function paintBall(ball, ctx) {
        ctx.beginPath();

        ctx.fillStyle = `hsl(${ball.color}, 95%, 50%)`;
        ctx.strokeStyle = 'black';

        ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);

        ctx.fill();
        ctx.stroke();
    }
}

function random(min, max) {
    return min + Math.ceil( Math.random() * (max - min) );
}