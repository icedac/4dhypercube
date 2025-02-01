import * as THREE from "three";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 6;
const d = 3;
function project(v: number[]): THREE.Vector3 {
  let [w, x, y, z] = v;
  let f = d/(d - w);
  return new THREE.Vector3(x*f, y*f, z*f);
}
function rot4d(v: number[], i: number, j: number, a: number): number[] {
  let r = v.slice();
  let c = Math.cos(a), s = Math.sin(a);
  r[i] = v[i]*c - v[j]*s;
  r[j] = v[i]*s + v[j]*c;
  return r;
}
function apply_rots(v: number[], rots: [number, number, number][]): number[] {
  let r = v.slice();
  for (let [i, j, a] of rots) r = rot4d(r, i, j, a);
  return r;
}
let verts: number[][] = [];
for (let i = 0; i < 16; i++){
  let coords: number[] = [];
  for (let b = 0; b < 4; b++){
    coords.push(((i >> b) & 1) ? 1 : -1);
  }
  verts.push(coords);
}
let edges: [number, number][] = [];
for (let i = 0; i < 16; i++){
  for (let j = i+1; j < 16; j++){
    let count = 0;
    for (let k = 0; k < 4; k++){
      if (Math.abs(verts[i][k] - verts[j][k]) === 2) count++;
    }
    if(count === 1) edges.push([i, j]);
  }
}
function createCylinder(): THREE.Mesh {
  let geometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
  let material = new THREE.MeshBasicMaterial({color: 0xffffff});
  return new THREE.Mesh(geometry, material);
}
function updateCylinder(cyl: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) {
  let dir = new THREE.Vector3().subVectors(to, from);
  let len = dir.length();
  let mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  cyl.position.copy(mid);
  let axis = new THREE.Vector3(0, 1, 0);
  let quat = new THREE.Quaternion().setFromUnitVectors(axis, dir.clone().normalize());
  cyl.quaternion.copy(quat);
  cyl.scale.set(1, len, 1);
}
let edgeMeshes: THREE.Mesh[] = [];
for (let [i, j] of edges) {
  let mesh = createCylinder();
  scene.add(mesh);
  edgeMeshes.push(mesh);
}
const ballRadius = 0.1;
let ballMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 16, 16), new THREE.MeshBasicMaterial({color: 0xff0000}));
scene.add(ballMesh);
let ball_pos: number[] = [0.5, 0.3, -0.2, 0.1];
let ball_vel: number[] = [0.01, -0.015, 0.012, 0.008];
let a01 = 0, a02 = 0, a03 = 0, a12 = 0, rs = 0.01;
function animate(){
  requestAnimationFrame(animate);
  a01 += rs; a02 += rs*0.5; a03 += rs*0.3; a12 += rs*0.7;
  let rots: [number, number, number][] = [[0,1,a01],[0,2,a02],[0,3,a03],[1,2,a12]];
  for (let i = 0; i < 4; i++){
    ball_pos[i] += ball_vel[i];
    if(ball_pos[i] > 1 - ballRadius || ball_pos[i] < -1 + ballRadius) ball_vel[i] *= -1;
  }
  ballMesh.position.copy(project(apply_rots(ball_pos, rots)));
  let rverts = verts.map(v => apply_rots(v, rots));
  let pverts = rverts.map(v => project(v));
  for (let k = 0; k < edges.length; k++){
    let [i, j] = edges[k];
    updateCylinder(edgeMeshes[k], pverts[i], pverts[j]);
  }
  renderer.render(scene, camera);
}
animate();
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
