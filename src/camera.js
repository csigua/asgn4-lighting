class Camera {
    constructor() {
        this.eye = new Vector3([0,1,-1.5]);
        this.at = new Vector3([0,0.2,10000000]);
        this.up = new Vector3([0,1,0]);
        this.atMag = this.at.magnitude();

        this.speed = 0.01;
        this.degree_change = 1;
    }

    forward() {
        let model_vector = new Vector3();
        model_vector.add(this.at);
        model_vector.sub(this.eye);
        model_vector.normalize();
        model_vector.mul(this.speed);
        this.at.add(model_vector);
        this.eye.add(model_vector);
    }

    back() {
        let model_vector = new Vector3();
        model_vector.sub(this.at);
        model_vector.add(this.eye);
        model_vector.normalize();
        model_vector.mul(this.speed);
        this.at.add(model_vector);
        this.eye.add(model_vector);
    }    
    
    left() {
        // let f = this.eye.sub(this.at);
        // f = f.normalize();
        let model_vector = new Vector3();
        model_vector.sub(this.at);
        model_vector.add(this.eye);
        model_vector.normalize();
        let s = Vector3.cross(model_vector, this.up);
        s.normalize();
        s.mul(this.speed);
        this.at.add(s);
        this.eye.add(s);
    }

    right() {
        // let f = this.eye.sub(this.at);
        // f = f.normalize();
        let model_vector = new Vector3();
        model_vector.add(this.at);
        model_vector.sub(this.eye);
        model_vector.normalize();
        let s = Vector3.cross(model_vector, this.up);
        s.normalize();
        s.mul(this.speed);
        this.at.add(s);
        this.eye.add(s);
    }

    rotate_left() {
        let atp = new Vector3();
        atp.add(this.at);
        atp.sub(this.eye);
        let r = atp.magnitude();
        let theta = Math.atan2(atp.elements[2], atp.elements[0]); 
        theta -= (Math.PI/180) * this.degree_change;
        let newDir = new Vector3();
        newDir.elements[0] = r * Math.cos(theta);
        newDir.elements[2] = r * Math.sin(theta);
        let newAt = new Vector3();
        newAt.elements[1] = this.at.elements[1];
        newAt.add(this.eye);
        newAt.add(newDir);
        this.at.set(newAt);
    }

    rotate_right() {
        let atp = new Vector3();
        atp.add(this.at);
        atp.sub(this.eye);
        let r = atp.magnitude();
        let theta = Math.atan2(atp.elements[2], atp.elements[0]); 
        theta += (Math.PI/180) * this.degree_change;
        let newDir = new Vector3();
        newDir.elements[0] = r * Math.cos(theta);
        newDir.elements[2] = r * Math.sin(theta);
        let newAt = new Vector3();
        newAt.elements[1] = this.at.elements[1];
        newAt.add(this.eye);
        newAt.add(newDir);
        this.at.set(newAt);
    }

    mouse_pan_horizontal(dist) {
        let atp = new Vector3();
        atp.add(this.at);
        atp.sub(this.eye);
        let rXZ = Math.sqrt(atp.elements[0] * atp.elements[0] + atp.elements[2] * atp.elements[2]);
        let theta = Math.atan2(atp.elements[2], atp.elements[0]);
        theta += (Math.PI / 180) * dist;
        let newDir = new Vector3();
        newDir.elements[0] = rXZ * Math.cos(theta);
        newDir.elements[1] = atp.elements[1];
        newDir.elements[2] = rXZ * Math.sin(theta);
        let newAt = new Vector3();
        newAt.add(this.eye);
        newAt.add(newDir);
        this.at.set(newAt);
    }

    mouse_pan_vertical(dist) {
        let atp = new Vector3();
        atp.add(this.at);
        atp.sub(this.eye);
        let x = atp.elements[0];
        let y = atp.elements[1];
        let z = atp.elements[2];
        let r = atp.magnitude();
        let horizontalDist = Math.sqrt(x * x + z * z);
        let pitchAngle = Math.atan2(y, horizontalDist);
        let deltaPitch = (Math.PI / 180) * dist;
        pitchAngle += deltaPitch;
        let newY = r * Math.sin(pitchAngle);
        let newHoriz = r * Math.cos(pitchAngle);
        let theta = Math.atan2(z, x);
        let newX = newHoriz * Math.cos(theta);
        let newZ = newHoriz * Math.sin(theta);
        let newDir = new Vector3([newX, newY, newZ]);
        let newAt = new Vector3();
        newAt.add(this.eye);
        newAt.add(newDir);
        this.at.set(newAt);
      }

    move_up() {
        this.at.elements[1] += this.speed;
        this.eye.elements[1] += this.speed;
    }

    move_down() {
        this.at.elements[1] -= this.speed;
        this.eye.elements[1] -= this.speed;
    }
}