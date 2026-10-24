/**
 * Interactive 3D view of the building model: drag to rotate, scroll to zoom, right-drag to pan.
 *
 * Local metres map to three.js as x → x, north → -z, height → y.
 */

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { centroid, type Point } from '../core/buildingModel/geometry'
import type { BuildingModel, Wall } from '../core/buildingModel/model'
import type { OutdoorUnitSpot, RadiatorZone } from '../core/buildingModel/placement'
import { MODEL_COLOURS } from './buildingModelColours'

type Props = {
  model: BuildingModel
  zones: RadiatorZone[]
  spots: OutdoorUnitSpot[]
  alternatives: Point[][]
  noWebglText: string
  onCapture?: (capture: () => string) => void
}

const shapeOf = (ring: Point[]) => new THREE.Shape(ring.map(p => new THREE.Vector2(p.x, p.y)))

const prism = (ring: Point[], heightM: number) => {
  const geometry = new THREE.ExtrudeGeometry(shapeOf(ring), { depth: heightM, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** Rotation about the vertical axis that turns +z towards the outward normal of a wall. */
const facing = (wall: Wall) => Math.atan2(wall.outward.x, -wall.outward.y)

const dashed = (points: Point[], colour: string, y: number, closed = false) => {
  const line = new (closed ? THREE.LineLoop : THREE.Line)(
    new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, y, -p.y))),
    new THREE.LineDashedMaterial({ color: colour, dashSize: 0.6, gapSize: 0.35 }),
  )
  line.computeLineDistances()
  return line
}

const label = (text: string, colour: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(32, 32, 28, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = colour
  context.font = 'bold 36px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 32, 34)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }))
  sprite.scale.set(1.2, 1.2, 1)
  return sprite
}

const buildScene = ({ model, zones, spots, alternatives }: Omit<Props, 'noWebglText' | 'onCapture'>) => {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#ffffff')
  scene.add(new THREE.HemisphereLight('#ffffff', '#b9c5bc', 2.2))
  const sun = new THREE.DirectionalLight('#ffffff', 1.6)
  sun.position.set(30, 60, 20)
  scene.add(sun)

  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshBasicMaterial({ color: MODEL_COLOURS.ground }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.02
  scene.add(ground)

  const neighbourMaterial = new THREE.MeshStandardMaterial({ color: MODEL_COLOURS.neighbour })
  for (const neighbour of model.neighbours) scene.add(new THREE.Mesh(prism(neighbour.ring, neighbour.heightM), neighbourMaterial))

  const house = prism(model.footprint, model.heightM)
  scene.add(new THREE.Mesh(house, new THREE.MeshStandardMaterial({ color: MODEL_COLOURS.building, transparent: true, opacity: 0.45, depthWrite: false })))
  scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(house), new THREE.LineBasicMaterial({ color: MODEL_COLOURS.edge })))

  const heating = new THREE.MeshBasicMaterial({ color: MODEL_COLOURS.heating, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  const floorHeating = new THREE.MeshBasicMaterial({ color: MODEL_COLOURS.heating, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  for (const zone of zones) {
    if (zone.kind === 'floor') {
      const floor = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(model.footprint)).rotateX(-Math.PI / 2), floorHeating)
      floor.position.y = zone.elevationM + 0.05
      scene.add(floor)
      continue
    }
    const { wall } = zone
    const band = new THREE.Mesh(new THREE.PlaneGeometry(wall.lengthM * 0.9, zone.topM - zone.bottomM), heating)
    const inset = 0.08
    band.position.set((wall.a.x + wall.b.x) / 2 - wall.outward.x * inset, (zone.bottomM + zone.topM) / 2, -((wall.a.y + wall.b.y) / 2 - wall.outward.y * inset))
    band.rotation.y = facing(wall)
    scene.add(band)
  }

  const unitMaterial = new THREE.MeshStandardMaterial({ color: MODEL_COLOURS.unit })
  for (const spot of spots) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 0.45), unitMaterial)
    unit.position.set(spot.position.x, 0.45, -spot.position.y)
    unit.rotation.y = facing(spot.wall)
    scene.add(unit)
    const tag = label(String(spot.rank), MODEL_COLOURS.unit)
    tag.position.set(spot.position.x, 1.7, -spot.position.y)
    scene.add(tag)
    if (spot.nearestNeighbour) scene.add(dashed([spot.position, spot.nearestNeighbour.point], MODEL_COLOURS.unit, 0.06))
  }
  for (const ring of alternatives) scene.add(dashed(ring, MODEL_COLOURS.alternative, 0.04, true))

  const centre = centroid(model.footprint)
  const north = label('N', MODEL_COLOURS.edge)
  north.position.set(centre.x, 0.6, -(centre.y + 28))
  scene.add(north)
  return { scene, target: new THREE.Vector3(centre.x, model.heightM / 2, -centre.y), size: Math.max(model.heightM, ...model.footprint.map(p => Math.hypot(p.x - centre.x, p.y - centre.y))) }
}

/**
 * Render the building model with orbit controls.
 *
 * :param props: Model, heating zones, outdoor unit spots, alternative outlines and a capture callback.
 * :returns: A canvas that fills its container.
 */
const BuildingModel3D = ({ model, zones, spots, alternatives, noWebglText, onCapture }: Props) => {
  const container = useRef<HTMLDivElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    const host = container.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    } catch {
      setWebglFailed(true)
      return
    }
    const { scene, target, size } = buildScene({ model, zones, spots, alternatives })
    const camera = new THREE.PerspectiveCamera(40, host.clientWidth / host.clientHeight, 0.5, 1000)
    camera.position.set(target.x + size * 2.2, target.y + size * 1.9, target.z + size * 2.6)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth, host.clientHeight)
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(target)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI * 0.49
    controls.minDistance = 5
    controls.maxDistance = 200
    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(scene, camera)
    })
    const resize = new ResizeObserver(() => {
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight)
    })
    resize.observe(host)
    onCapture?.(() => {
      renderer.render(scene, camera)
      return renderer.domElement.toDataURL('image/png')
    })

    return () => {
      resize.disconnect()
      renderer.setAnimationLoop(null)
      controls.dispose()
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
          object.geometry.dispose()
          const material = object.material as THREE.Material & { map?: THREE.Texture }
          material.map?.dispose()
          material.dispose()
        }
      })
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [model, zones, spots, alternatives, onCapture])

  return webglFailed ? <p className="report-empty">{noWebglText}</p> : <div className="building-model-canvas" ref={container} />
}

export default BuildingModel3D
