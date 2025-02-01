import * as THREE from "three";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 6;
const d = 3;
function project(v: number[]): THREE.Vector3 {
  let [w,x,y,z] = v, f = d/(d-w);
  return new THREE.Vector3(x*f,y*f,z*f);
}
function rot4d(v: number[], i: number, j: number, a: number): number[] {
  let r = v.slice(), c = Math.cos(a), s = Math.sin(a);
  r[i] = v[i]*c - v[j]*s;
  r[j] = v[i]*s + v[j]*c;
  return r;
}
function apply_rots(v: number[], rots: [number,number,number][]): number[] {
  let r = v.slice();
  for(let [i,j,a] of rots) r = rot4d(r,i,j,a);
  return r;
}
let verts: number[][] = [];
for(let i=0;i<16;i++){
  let coords: number[] = [];
  for(let b=0;b<4;b++) coords.push(((i>>b)&1)?1:-1);
  verts.push(coords);
}
let edges: [number,number][] = [];
for(let i=0;i<16;i++){
  for(let j=i+1;j<16;j++){
    let count=0;
    for(let k=0;k<4;k++){
      if(Math.abs(verts[i][k]-verts[j][k])===2) count++;
    }
    if(count===1) edges.push([i,j]);
  }
}
function createCylinder(): THREE.Mesh {
  let geometry = new THREE.CylinderGeometry(0.02,0.02,1,8);
  return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xffffff}));
}
function updateCylinder(cyl: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  let dir = new THREE.Vector3().subVectors(to,from), len = dir.length(), mid = new THREE.Vector3().addVectors(from,to).multiplyScalar(0.5);
  cyl.position.copy(mid);
  let axis = new THREE.Vector3(0,1,0), quat = new THREE.Quaternion().setFromUnitVectors(axis,dir.clone().normalize());
  cyl.quaternion.copy(quat);
  cyl.scale.set(1,len,1);
}
let edgeMeshes: THREE.Mesh[] = [];
for(let [i,j] of edges){
  let mesh = createCylinder();
  scene.add(mesh);
  edgeMeshes.push(mesh);
}
const ballRadius = 0.1;
class Ball {
  pos: number[];
  vel: number[];
  coll: boolean[];
  radius: number;
  colorHex: number;
  channel: string;
  mesh: THREE.Mesh;
  constructor(pos: number[], vel: number[], radius: number, colorHex: number, channel: string) {
    this.pos = pos.slice();
    this.vel = vel.slice();
    this.radius = radius;
    this.colorHex = colorHex;
    this.channel = channel;
    this.coll = [false,false,false,false];
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,16,16), new THREE.MeshBasicMaterial({color: colorHex}));
    scene.add(this.mesh);
  }
  update() {
    for(let i=0;i<4;i++){
      this.pos[i] += this.vel[i];
      if((this.pos[i] > 1 - this.radius && this.vel[i] > 0) || (this.pos[i] < -1 + this.radius && this.vel[i] < 0)){
        if(!this.coll[i]){
          let sign = (this.pos[i]>0)?1:-1;
          let f = getFacet(i,sign);
          if(f){ f.state[this.channel] = 255; f.state.a = 128; }
          this.vel[i] *= -1;
          this.coll[i] = true;
        }
      } else this.coll[i] = false;
    }
  }
  draw(rots: [number,number,number][]) {
    let posRot = apply_rots(this.pos, rots);
    let projected = project(posRot);
    this.mesh.position.copy(projected);
    let dist = camera.position.distanceTo(projected);
    let scaleFactor = dist / 6;
    this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  }
}
class Teselect {
  balls: Ball[] = [];
  add(ball: Ball) { this.balls.push(ball); }
  update() { for(let ball of this.balls) ball.update(); }
  draw(rots: [number,number,number][]) { for(let ball of this.balls) ball.draw(rots); }
}
const ballRed = new Ball([0.5,0.3,-0.2,0.1],[0.01,-0.015,0.012,0.008],ballRadius,0xff0000,"r");
const ballGreen = new Ball([-0.5,0.4,0.2,-0.3],[-0.008,0.012,-0.01,0.009],ballRadius,0x00ff00,"g");
const ballBlue = new Ball([0.2,-0.3,0.5,-0.2],[0.012,0.009,-0.008,0.01],ballRadius,0x0000ff,"b");
const teserect = new Teselect();
teserect.add(ballRed);
teserect.add(ballGreen);
teserect.add(ballBlue);

// 수정: 올바른 삼각분할 인덱스 배열 사용 (각 면을 두 삼각형으로)
const cubeIndicesFixed = [
  0,1,3, 0,3,2,    // 한 면
  4,6,7, 4,7,5,    // 맞은편 면
  0,2,6, 0,6,4,    // 옆면
  1,5,7, 1,7,3,    // 반대 옆면
  0,4,5, 0,5,1,    // 아래면
  2,3,7, 2,7,6     // 윗면
];
let facets: any[] = [];
function genFacetVerts(fixedIdx: number, fixedVal: number): number[][] {
  let freeIdx: number[] = [];
  for(let i=0;i<4;i++){ if(i!==fixedIdx) freeIdx.push(i); }
  let vertsArr: number[][] = [];
  for(let i=0;i<8;i++){
    let bits = [(i>>0)&1,(i>>1)&1,(i>>2)&1];
    let v: number[] = []; let bitIdx = 0;
    for(let j=0;j<4;j++){
      if(j===fixedIdx) v.push(fixedVal);
      else { v.push(bits[bitIdx] ? 1 : -1); bitIdx++; }
    }
    vertsArr.push(v);
  }
  return vertsArr;
}
for(let i=0;i<4;i++){
  for(let s of [1,-1]){
    let facet: any = {axis: i, sign: s, canonical: genFacetVerts(i,s), state: {r:0,g:0,b:0,a:0}};
    let posArr = new Float32Array(8*3);
    let geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(posArr,3));
    // 수정: 인덱스 배열 교체
    geom.setIndex(cubeIndicesFixed);
    let mat = new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0, side:THREE.DoubleSide});
    let mesh = new THREE.Mesh(geom,mat);
    scene.add(mesh);
    facet.geometry = geom; facet.mesh = mesh;
    facets.push(facet);
  }
}
function getFacet(axis: number, sign: number): any {
  return facets.find(f=>f.axis===axis && f.sign===sign);
}
let a01=0, a02=0, a03=0, a12=0, rs=0.01;
let lastTime = performance.now();
function animate(){
  requestAnimationFrame(animate);
  let now = performance.now(), dt = (now-lastTime)/1000; lastTime = now;
  a01 += rs; a02 += rs*0.5; a03 += rs*0.3; a12 += rs*0.7;
  let rots: [number,number,number][] = [[0,1,a01],[0,2,a02],[0,3,a03],[1,2,a12]];
  teserect.update();
  teserect.draw(rots);
  let rverts = verts.map(v => apply_rots(v, rots));
  let pverts = rverts.map(v => project(v));
  for(let k=0;k<edges.length;k++){
    let [i,j] = edges[k];
    updateCylinder(edgeMeshes[k], pverts[i], pverts[j]);
  }
  for(let f of facets){
    f.state.r = Math.max(0, f.state.r - 255/1*dt);
    f.state.g = Math.max(0, f.state.g - 255/1*dt);
    f.state.b = Math.max(0, f.state.b - 255/1*dt);
    f.state.a = Math.max(0, f.state.a - 255/2*dt);
    f.mesh.material.color.setRGB(f.state.r/255, f.state.g/255, f.state.b/255);
    f.mesh.material.opacity = f.state.a/255;
    let pos = f.geometry.attributes.position.array;
    for(let i=0;i<f.canonical.length;i++){
      let p = project(apply_rots(f.canonical[i],rots));
      pos[i*3+0]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
    }
    f.geometry.attributes.position.needsUpdate = true;
  }
  renderer.render(scene,camera);
}
animate();
window.addEventListener("resize",()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
