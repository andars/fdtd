'use strict';

var canvas = document.querySelector('#plot');
canvas.width = window.innerWidth*0.98;
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
    var x = linspace(0,1,sim.npoints);

    ctx.save();
    transform(x, v);
    ctx.fillStyle = 'green';
    ctx.globalAlpha = 0.2;
    var max = Math.ceil(sim.npoints/3) * 1/(sim.npoints - 1);
    ctx.fillRect(  0, -2, max, 4);
    ctx.globalAlpha = 0.4;
    ctx.fillRect(max, -2,   1, 4);
    ctx.restore();

    // draw x axis
    ctx.save();
    transform(x,v);
    ctx.moveTo(-100,0);
    ctx.lineTo(100,0);
    ctx.restore(); ctx.strokeStyle='black';
    ctx.stroke();

    // plot voltage
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

    // plot current
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

function Simulation(dt, length, v) {
  var k = v*dt;
  this.vp = v;
  this.dx = 3*k;
  this.length = length;
  this.npoints = Math.ceil(this.length/this.dx);

  this.voltage = new Float32Array(this.npoints);
  this.current = new Float32Array(this.npoints-1);
  this.imp = new Float32Array(this.npoints);

  for (var i = 0; i<this.npoints; i++) {
    this.imp[i] = i < this.npoints/3 ? 10 : 30;
  }

  this.c = v*dt/this.dx;
  console.log('Courant: ' + this.c);

  this.t = 0;
  this.last_report = -1;
  this.input_energy = 0;
  console.log(this.dx + ' ' + this.npoints);
}

Simulation.prototype.report_energy = function() {
    if (this.t - this.last_report > 5000e-9) {
        console.log('energy at', this.t);
        this.last_report = this.t;

        // c = 1 / sqrt(L * C)
        // Z = sqrt(L / C)
        //
        // Z/c = sqrt(L) / sqrt(C) * sqrt(L) * sqrt(C) = L
        // 1/(c * Z) = sqrt(L) * sqrt(C) * sqrt(C) / sqrt(L) = C

        var magnetic_energy = 0;

        for (var i = 0; i < this.npoints - 1; i++) {
            var inductance_per_length = this.imp[i]/this.vp;
            var segment_energy = 0.5 * this.dx * inductance_per_length * this.current[i] ** 2;
            magnetic_energy += segment_energy;

            if (isNaN(magnetic_energy)) {
                console.log(i);
                console.log(segment_energy);
            }
        }

        var electric_energy = 0;
        for (var i = 0; i < this.npoints; i++) {
            var capacitance_per_length = 1/(this.imp[i] * this.vp);
            var segment_energy = 0.5 * this.dx * capacitance_per_length * this.voltage[i] ** 2;
            electric_energy += segment_energy;

            if (isNaN(electric_energy)) {
                console.log(i);
                console.log(segment_energy);
            }
        }
        console.log(magnetic_energy, electric_energy);
        console.log('total energy ' + (magnetic_energy + electric_energy));
        console.log('input energy ' + this.input_energy);
    }
}

Simulation.prototype.update = function(dt) {
  this.t += dt;

  for (var i = 0; i < this.npoints-1; i++) {
    this.current[i] -= this.c/this.imp[i]*(this.voltage[i+1] - this.voltage[i]);
  }

  this.voltage[0] = this.source(this.t);

  for (var i = 1; i < this.npoints-1; i++) {
    this.voltage[i] -= this.c*this.imp[i]*(this.current[i] - this.current[i-1]);
  }

  var input_power = this.voltage[0]*this.current[0];
  this.input_energy += input_power * dt;

  this.report_energy();
}

Simulation.prototype.source = function(t) {
  var center = 3e-6;
  var width = 1e-6;

  return Math.exp(-Math.pow((t - center)/width, 2));
}

var dt = 5e-9;
var len = 1;
var vp = 1e5;
var sim = new Simulation(dt, len, vp);

var slack = 0;
var now = window.performance.now();
var last = now;

function tick() {
  now = window.performance.now();
  var delta = now-last;
  delta = delta > 100 ? 10 : delta;
  slack += delta*1e-9;

  var ticks = 0;
  while (slack > dt) {
    ticks++;
    sim.update(dt);
    slack -= dt;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  plot(sim.voltage, sim.current);

  last = now;
  requestAnimationFrame(tick);
}

tick();
