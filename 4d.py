import vpython as vp, numpy as np
d=3
def project(v):
 w,x,y,z=v; f=d/(d-w); return vp.vector(x*f,y*f,z*f)
def rot4d(v,i,j,a):
 r=np.copy(v); c=np.cos(a); s=np.sin(a); r[i]=v[i]*c - v[j]*s; r[j]=v[i]*s + v[j]*c; return r
def apply_rots(v,rots):
 r=np.copy(v)
 for (i,j,a) in rots:
  r=rot4d(r,i,j,a)
 return r
verts=[]
for i in range(16):
 coords=[1 if (i>>b)&1 else -1 for b in range(4)]
 verts.append(np.array(coords,dtype=float))
verts=np.array(verts)
edges=[]
for i in range(16):
 for j in range(i+1,16):
  if np.sum(np.abs(verts[i]-verts[j])==2)==1:
   edges.append((i,j))
edge_objs=[vp.cylinder(pos=project(verts[i]), axis=project(verts[j])-project(verts[i]), radius=0.02, color=vp.color.white) for i,j in edges]
ball=vp.sphere(pos=project(np.array([0,0,0,0],dtype=float)), radius=0.1, color=vp.color.red)
ball_pos=np.array([0.5,0.3,-0.2,0.1])
ball_vel=np.array([0.01,-0.015,0.012,0.008])
a01=a02=a03=a12=0; rs=0.01
while True:
 vp.rate(100)
 a01+=rs; a02+=rs*0.5; a03+=rs*0.3; a12+=rs*0.7
 rots=[(0,1,a01),(0,2,a02),(0,3,a03),(1,2,a12)]
 ball_pos+=ball_vel
 for i in range(4):
  if ball_pos[i]>1-ball.radius or ball_pos[i]<-1+ball.radius: ball_vel[i]*=-1
 ball.pos=project(apply_rots(ball_pos,rots))
 rverts=np.array([apply_rots(v,rots) for v in verts])
 pverts=[project(v) for v in rverts]
 for k,(i,j) in enumerate(edges):
  edge_objs[k].pos=pverts[i]
  edge_objs[k].axis=pverts[j]-pverts[i]
