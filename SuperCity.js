import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class SuperCity extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            square: new defs.Square(3)
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
        };

        // *** Materials
        this.materials = {
            planet1: new Material(new defs.Phong_Shader(),
                {color: hex_color("#969696"), ambient: 0, specularity: 0, diffusivity: 1}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, -3, 5), vec3(0,0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);


        if (this.attached != null && this.attached() != null) {
            const desired_camera_matrix = Mat4.inverse(
                this.attached().times(
                    Mat4.translation(0,0,5)
                )
            ).map(
                (x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)
            );
            program_state.set_camera(desired_camera_matrix);
        } else if (this.attached != null && this.attached() == null) {
            program_state.set_camera(this.initial_camera_location.map(
                (x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)
            ))
        }

        program_state.lights = [new Light(vec4(0, 0, 0, 1), color(1,1,1), 10000)];

        this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,0,-2)).times(Mat4.scale(20,20,20)), this.materials.planet1)
        this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(-2,-2,-1.9)).times(Mat4.scale(0.25,0.25,0.25)), this.materials.planet1.override({color:hex_color("#FF0000")}))
        this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(2,2,-1.9)).times(Mat4.scale(0.25,0.25,0.25)), this.materials.planet1.override({color:hex_color("#00FFFF")}))
        //this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,-1,-2)), this.materials.planet1)
        //this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(-2,-2,-2)), this.materials.planet1)



    }
}


class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II). according to slides calculate gl_position here
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          gl_Position = projection_camera_model_transform * vec4(position, 1.0);
          point_position = vec4(position, 1.0);
          center = vec4(0.0,0.0,0.0,1.0);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            float distance_center = distance(point_position, center);
            float factor = 0.5 + 0.5 * sin(distance_center*8.0 * (2.0 * 3.14159));
            gl_FragColor = vec4(0.6875 * factor, 0.5 * factor,0.25*factor,1);
        }`;
    }
}

