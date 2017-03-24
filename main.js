var canvas = document.querySelector('#plot');
var ctx = canvas.getContext('2d');

ctx.strokeStyle='black';

function linspace(a, b, n) {
    var result = [];
    for (var i = 0; i<n; i++) {
        result.push(a + (b-a)/(n-1) * i);
    }
    return result;
}

function max(xs) {
  var max = xs[0];
  for (var i = 0; i<xs.length; i++) {
    max = Math.max(max, xs[i]);
  }
  return max;
}

function min(xs) {
  var min = xs[0];
  for (var i = 0; i<xs.length; i++) {
    min = Math.min(min, xs[i]);
  }
  return min;
}


function transform(x,y) {
  //ctx.scale(canvas.width/(max(x)-min(x)), -canvas.height/(2*(max(y))-min(y)));
  ctx.scale(canvas.width/(max(x)-min(x)), -canvas.height/4);
  ctx.translate(0, -2);
}


function plot(v, c) {
    // draw x axis
    ctx.save();
    var x = linspace(0,1,sim.npoints);
    transform(x,v);
    ctx.moveTo(-100,0);
    ctx.lineTo(100,0);
    ctx.restore(); ctx.strokeStyle='black';
    ctx.stroke();

    ctx.save();
    transform(x,v);
    ctx.beginPath();
    ctx.moveTo(x[0], v[0]);
    for (var i = 0; i<x.length; i++) {
        ctx.lineTo(x[i], v[i]);
    }
    ctx.restore();
    ctx.strokeStyle='blue';
    ctx.stroke();

    ctx.save();
    transform(x,v);
    ctx.beginPath();
    ctx.moveTo(x[0], c[0]);
    for (var i = 0; i<x.length; i++) {
        ctx.lineTo(x[i], c[i]);
    }
    ctx.restore();
    ctx.strokeStyle='red';
    ctx.stroke();
}

function Simulation(npoints, length, imp) {
  this.npoints = npoints;
  this.voltage = new Float32Array(npoints);
  this.current = new Float32Array(npoints);
  this.length = length;
  this.dx = length/npoints;
  this.imp = imp;
  this.t = 0;
}

Simulation.prototype.update = function(dt) {
  this.t += dt;

  var v = 1.0;
  var c = this.dx/dt*v;
  for (var i = 0; i < this.npoints-1; i++) {
    this.current[i] -= c*(dt/this.dx)*(this.voltage[i+1] - this.voltage[i])/this.imp;
  }
  for (var i = 1; i < this.npoints; i++) {
    this.voltage[i] -= c*(dt/this.dx)*(this.current[i] - this.current[i-1])*this.imp;
  }
  this.voltage[250] = this.source(this.t);
}

Simulation.prototype.source = function(t) {
  var center = 3e-6;
  var width = 1e-6;
  return Math.exp(-Math.pow((t - center)/width, 2));
  if (center - width <= t && t <= center + width) {
    return 1;
  } else {
    return 0;
  }
}

var sim = new Simulation(500, 1e3, 10);
var now = window.performance.now();
var last = now;

function tick() {
  now = window.performance.now();
  var dt = now-last;
  dt = (dt > 100 ? 10 : dt)*1e-9;

  sim.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  plot(sim.voltage, sim.current);

  last = now;
  requestAnimationFrame(tick);
}

tick();
