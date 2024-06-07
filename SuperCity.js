import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const BASE_Z = -2
const compare_coords = (a,b) => (a[0] === b[0]) && (a[1] === b[1])
const GRAVITY = -0.002;

export class SuperCity extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.occupied_coordinates = [];

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            square: new defs.Square(3),
            cylinder: new defs.Capped_Cylinder(50,50),
            cube: new defs.Cube(),
            triangle: new defs.Triangle(),
            sphere: new defs.Subdivision_Sphere(4),
            axis: new defs.Axis_Arrows()

            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
        };

        // *** Materials
        this.materials = {
            planet1: new Material(new defs.Phong_Shader(),
                {color: hex_color("#969696"), ambient: 0, specularity: 0, diffusivity: 1}),
            sunMaterial: new Material(new defs.Phong_Shader(),
                {color: hex_color("#969696"), ambient: 1, specularity: 0, diffusivity: 0}),
            building1: new Material(new defs.Phong_Shader(),
                {color: hex_color("#969696"), ambient: 0.2, specularity: 0.3, diffusivity: .5}),
            house: new Material(new defs.Phong_Shader(),
                {color: hex_color("#FFC0CB"), ambient: 0.2, specularity: 0.5, diffusivity: 0.5}),
            tower_blue: new Material(new defs.Phong_Shader(),
                {color: hex_color("#5576a9"), ambient: 0.2, specularity: 0, diffusivity: 0.3}),
            tower_window: new Material(new defs.Phong_Shader(),
                {color: hex_color("#DDDDDD"), ambient: .6, specularity: 0.1, diffusivity: 0.4}),
            helipad_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), texture: new Texture("./assets/helipad.png"), ambient: 0.2, specularity: 0.4}),
            door: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), texture: new Texture("./assets/door.png"), ambient:0.2}),
            selected_square: new Material(new defs.Phong_Shader(),
                {color: hex_color("#ff005b"), ambient: 0.5, specularity: 0, diffusivity: 0.5}),
            ground_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#101010"), texture: new Texture("./assets/ground.png"), ambient: 0.4, diffusivity: 1, specularity: 0.3}),
            asteroid: new Material(new defs.Phong_Shader(),
                {color: hex_color("#FF0000"), ambient: 0.3, diffusivity: 0.3, specularity: 0.}),
            office: new Material(new defs.Textured_Phong(),
                {color: hex_color("#46444C"), ambient: 0.5, specularity: 0.5, diffusivity: 0.5}),
            window: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"),texture: new Texture("./assets/window.png"), ambient: 1}),


        }

        this.initial_camera_location = Mat4.look_at(vec3(0, -3, 5), vec3(0,0, 0), vec3(0, 1, 0));
        this.selection = [0,1];
        this.towers = [[2,2], [-1,-1]];
        this.houses = [[1,3], [1,1]];
        this.offices = [[1,2]];
        this.buildings = [[0,-1],[0,-3]];
        this.hazards = []

        this.desired_camera_x = 0
        this.desired_camera_y = -5
        this.desired_camera_z = 20;
        this.base_speed = 0.2;
        this.current_z_speed = 0;
        this.current_y_speed = this.base_speed;
        this.current_x_speed = this.base_speed;
        this.camera_x = this.desired_camera_x;
        this.camera_z = this.desired_camera_y;
        this.camera_y = this.desired_camera_z;
        this.step = 1;

        this.in_superhero_mode = false;
        this.superhero_tilt_angle = Math.PI/2;
        this.superhero_pan_angle = 0;
        this.superhero_roll_angle = 0;
        this.superhero_tilt_angular_velocity = 0;
        this.superhero_pan_angular_velocity = 0;
        this.superhero_roll_angular_velocity = 0;
        this.superhero_accel_forward = 0;
        this.superhero_accel_up = 0;
        this.superhero_accel_z = 0;
        this.superhero_accel_y = 0;
        this.superhero_accel_x = 0;
        this.superhero_velocity_forward = 0;
        this.superhero_velocity_z = 0;
        this.superhero_velocity_y = 0;
        this.superhero_velocity_x = 0;
        this.superhero_boost_time = 0;
        this.superhero_jump_time = 0;
        this.superhero_moving_forward = false;
        this.superhero_moving_backward = false;

        this.cd_cylinders = [];
        this.cd_cubes = [];

        this.occupied_coordinates = [];


    }

    add_hazards(min_asteroids, max_asteroids, max_height, min_height) {
        if (this.hazards.length > 0) {
            return;
        }
        const num_asteroids = min_asteroids === max_asteroids ? min_asteroids : (Math.floor(Math.random() * (max_asteroids - min_asteroids)) + min_asteroids);
        console.log("ASTEROIDS GENERATED", num_asteroids);
        const possible_positions = this.offices.concat(this.houses.concat(this.towers))
        const square_positions = []
        for(let i = 0; i < num_asteroids; i++) {
            let square_position = -1
            while (square_position === -1 || square_positions.includes(square_position)) {
                square_position = Math.floor(Math.random() * possible_positions.length);
            }
            if (! square_positions.includes(square_position)) {
                square_positions.push(square_position)
            }
            const square = possible_positions[square_position]
            const height = Math.floor(Math.random() * (max_height - min_height)) + min_height;
            this.hazards.push([square[0], square[1], height]);
        }
        console.log(square_positions)
    }

    add_tower(x, y) {
        for (let i = 0; i < this.towers.length; i++) {
            if (compare_coords(this.towers[i], [x,y])) {
                return;
            }
        }
        this.towers.push([x,y]);
    }

    add_house(x,y) {
        console.log(x,y)
        for (let i = 0; i < this.houses.length; i++) {
            if (compare_coords(this.houses[i], [x,y])) {
                return;
            }
        }
        this.houses.push([x,y]);
    }
     add_building(x,y) {
        console.log(x,y)
        for (let i = 0; i < this.buildings.length; i++) {
            if (compare_coords(this.buildings[i], [x,y])) {
                return;
            }
        }
        this.buildings.push([x,y]);
    }

    add_office(x, y) {
        for (let i = 0; i < this.offices.length; i++) {
            if (compare_coords(this.offices[i], [x,y])) {
                return;
            }
        }
        this.offices.push([x,y]);
    }

    remove(x,y) {
        this.towers = this.towers.filter((i) => (i[0] !== x) || (i[1] !== y));
        this.houses = this.houses.filter((i) => (i[0] !== x) || (i[1] !== y));
        this.offices = this.offices.filter((i) => (i[0] !== x) || (i[1] !== y));
        this.buildings = this.buildings.filter((i) => (i[0] !== x) || (i[1] !== y))
        this.hazards = this.hazards.filter((i) => (i[0] !== x) || (i[1] !== y));
    }

    remove_hazard(position) {
        this.hazards.splice(position, 1)
    }

    move_up () {
        if (this.in_superhero_mode) {
            if (this.lower_collision().result) {
                this.superhero_velocity_forward = 0.2;
                this.superhero_moving_forward = true;
            } else {
                this.superhero_tilt_angular_velocity = Math.PI / 70;
            }
        }
        else if (this.current_y_speed < 0 || Math.abs(this.desired_camera_y - this.camera_z) < this.current_y_speed*5) {
            this.desired_camera_y += this.step;
        }
    }
    move_up_release () {
        if (this.in_superhero_mode) {
            if (this.lower_collision().result) {
                this.superhero_velocity_z = 0;
            } else {
                this.superhero_tilt_angular_velocity = 0;
            }
            this.superhero_moving_forward = false;
        }

    }
    move_down () {
        if (this.in_superhero_mode) {
            if (this.lower_collision().result) {
                this.superhero_velocity_forward = -0.15;
                this.superhero_moving_forward = true;
            } else {
                this.superhero_tilt_angular_velocity = -Math.PI / 70;
            }
        }
        else if (this.current_y_speed > 0 || Math.abs(this.desired_camera_y - this.camera_z) < -this.current_y_speed * 5){
            this.desired_camera_y -= this.step
        }
    }
    move_down_release () {
        this.move_up_release();
    }
    move_right () {
        if (this.in_superhero_mode) {
            this.superhero_pan_angular_velocity = -Math.PI/70
            this.superhero_panning = true;
        }
        else if (this.current_x_speed < 0 || Math.abs(this.desired_camera_x - this.camera_x) < this.current_x_speed*5) {
            this.desired_camera_x += this.step;
        }
    }
    move_right_release () {
        if (this.in_superhero_mode) {
            this.superhero_pan_angular_velocity = 0;
            this.superhero_panning = false;
        }
    }
    move_left () {
        if (this.in_superhero_mode) {
            this.superhero_pan_angular_velocity = Math.PI/70
            this.superhero_panning = true;
        }
        else if (this.current_x_speed > 0 || Math.abs(this.desired_camera_x - this.camera_x) < -this.current_x_speed * 5){
            this.desired_camera_x -= this.step
        }
    }
    move_left_release () {
        this.move_right_release();
    }

    toggle_superhero_mode () {
        this.in_superhero_mode = ! this.in_superhero_mode;
        if (this.in_superhero_mode) {
            this.camera_x = this.selection[0]*4;
            this.camera_z = this.selection[1]*4;
            this.camera_y = 4;
            this.superhero_tilt_angular_velocity = 0;
            this.superhero_pan_angular_velocity = 0;
            this.superhero_velocity_forward = 0;
            this.superhero_accel_forward = 0;
            this.superhero_velocity_y = 0;
            this.superhero_accel_y = 0;
            this.superhero_moving_forward = true;
            this.superhero_panning = true;
        } else {
            this.camera_x = this.desired_camera_x;
            this.camera_z = this.desired_camera_y;
            this.camera_y = this.desired_camera_z;
        }
        console.log(this.in_superhero_mode);
    }

    superhero_jump_boost () {
        if (! this.lower_collision().result) {
            this.superhero_boost_time = 100;
        } else {
            this.superhero_jump_time = 3;
            this.camera_z += 0.0001;
        }
    }

    lower_collision () {
        return {"result": this.camera_z <= -1.6, "edge": -1.6};
    }


    hazard_collision() {
        for (let i = 0; i < this.hazards.length; i++) {
            if (Math.sqrt((this.camera_x - this.hazards[i][0]*4) ** 2 + (this.camera_y - this.hazards[i][1]*4) ** 2 + (this.camera_z - this.hazards[i][2]) ** 2) < 3) {
                //TODO: add sound here
                console.log(i)
                this.remove_hazard(i)
                //this.hazards = this.hazards
            }
        }
    }

    hazard_movement() {
        let i = 0
        const to_remove = [];
        for (let i = 0; i < this.hazards.length; i++) {
            this.hazards[i][2] -= 0.003;
            let removed = false;
            for (let j = 0; j < this.towers.length; j++) {
                if (compare_coords(this.hazards[i].slice(0, 2), this.towers[j]) && this.hazards[i][2] < 4.75) {
                    this.remove(...this.towers[j]);
                    removed = true;
                    break;
                }
            }
            if (removed) {
                break;
            }

            const short_buildings = this.offices.concat(this.houses);
            for (let j = 0; j < short_buildings.length; j++) {
                if (compare_coords(this.hazards[i].slice(0,2), short_buildings[j]) && this.hazards[i][2] < 2) {
                    this.remove(...short_buildings[j]);
                    break;
                }
            }
        }
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Toggle Superhero Mode", ["l"], this.toggle_superhero_mode);
        this.key_triggered_button("Superhero Jump / Boost", ["k"], this.superhero_jump_boost);
        this.new_line();
        this.key_triggered_button("Asteroids!", ["j"], () => this.add_hazards(3, 6, 7,10))
        this.new_line();
        this.key_triggered_button("Move up", ["ArrowUp"], this.move_up, undefined, this.move_up_release)
            //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y) < this.current_y_speed *10 ? this.step : 0));
            //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y)) < )
        this.key_triggered_button("Move down", ["ArrowDown"], this.move_down, undefined, this.move_down_release);
        this.new_line()
        this.key_triggered_button("Move left", ["ArrowLeft"], this.move_left, undefined, this.move_left_release);
        //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y) < this.current_y_speed *10 ? this.step : 0));
        //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y)) < )
        this.key_triggered_button("Move right", ["ArrowRight"], this.move_right, undefined, this.move_right_release);

        this.key_triggered_button("Select up", ["Alt", "ArrowUp"], () => this.selection[1]++);
        this.key_triggered_button("Select down", ["Alt","ArrowDown"], () => this.selection[1]--);
        this.new_line();
        this.key_triggered_button("Select left", ["Alt", "ArrowLeft"], () => this.selection[0]--);
        this.key_triggered_button("Select right", ["Alt", "ArrowRight"], () => this.selection[0]++);
        this.new_line();
        this.key_triggered_button("Demolish", ["e"], () => this.remove(this.selection[0], this.selection[1]));
        this.new_line();
        this.key_triggered_button("Build tower", ["t"], () => this.add_tower(this.selection[0], this.selection[1]));
        this.key_triggered_button("Build house", ["h"], () => this.add_house(this.selection[0], this.selection[1]));
        this.key_triggered_button("Build office", ["o"], () => this.add_office(this.selection[0], this.selection[1]));
    }

    draw_hazard(context, program_state, x, y, z, color) {
        this.shapes.sphere.draw(
            context, program_state,
            Mat4.identity().times(Mat4.translation(x*4,y*4,z)).times(Mat4.scale(1.3,1.3,1.3)),
            this.materials.asteroid.override(color)
        );
    }

     draw_building(context, program_state, x, y, floor_count) {
        const blk = vec4(0, 0, 0, 1);
        let model_transform = Mat4.identity().times(Mat4.translation(x, y, -1));

        // Draw the base cube
        let base_transform = model_transform.times(Mat4.scale(1.5, 1.5, 1));
        //base_transform = base_transform.times(Mat4.translation(0,0,-1))
        this.shapes.cube.draw(context, program_state, base_transform, this.materials.house.override({color: blk}));
        //draw door
        let door_transform = model_transform.times(Mat4.translation(0, -1.51, 0.01)); // Position the door in front
        door_transform = door_transform.times(Mat4.scale(0.6, 0.6, 0.7)); // Scale to the size of the door
        door_transform = door_transform.times(Mat4.rotation(Math.PI/2.0, -1, 0, 0));
        this.shapes.square.draw(context, program_state, door_transform, this.materials.door)

        // Draw the floors
        for (let i = 1; i < floor_count; i++) {
            let floor_transform = model_transform.times(Mat4.translation(0, 0,  i+1)); // Adjust translation for stacking floors
            floor_transform = floor_transform.times(Mat4.scale(1.5, 1.5, 1));
            this.shapes.cube.draw(context, program_state, floor_transform, this.materials.office);
            floor_transform = model_transform.times(Mat4.translation(0, 0,  i+1)); // Adjust translation for stacking floors
            floor_transform = floor_transform.times(Mat4.scale(1.49, 1.49, 0.99));
            this.shapes.cube.draw(context, program_state, floor_transform, this.materials.house.override({color: blk}));

        }
        //draw windows
        for (let i = 1; i <= floor_count; i++) {
            //front face
            let window_transform = model_transform.times(Mat4.translation(0.5, -1.51, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(-0.5, -1.51, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            //back face
            window_transform = model_transform.times(Mat4.translation(-0.5, 1.51, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(0.5, 1.51, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            //left side face
            window_transform = model_transform.times(Mat4.translation(-1.51, -0.5, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(-1.51, 0.5, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            //right side face
            window_transform = model_transform.times(Mat4.translation(1.51, -0.5, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(1.51, 0.5, 0.5+i));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);
            this.occupied_coordinates.push([x, y]);

        }

    }

    draw_house(context, program_state, x, y, color) {

            let model_transform = Mat4.identity().times(Mat4.translation(x, y, -1));
            this.shapes.cube.draw(context, program_state, model_transform, this.materials.house.override({color: color}));

            const blk = vec4(0, 0, 0, 1);
            const mixed_color = color.mix(blk, 0.5);

            // Draw the first slanted rectangle
            let roof_transform = model_transform;
            roof_transform = roof_transform.times(Mat4.translation(-0.53, 0.0, 1.47));  // Move to top of the cube
            roof_transform = roof_transform.times(Mat4.rotation(Math.PI / 4, 0, -1, 0));  // Rotate to be slanted
            roof_transform = roof_transform.times(Mat4.scale(0.75, 1, Math.sqrt(2) / 2));  // Scale to cover the top of the cube
            this.shapes.square.draw(context, program_state, roof_transform, this.materials.house.override({color: mixed_color}));

            // Draw the second slanted rectangle
            roof_transform = model_transform;
            roof_transform = roof_transform.times(Mat4.translation(0.53, 0.0, 1.47));  // Move to top of the cube
            roof_transform = roof_transform.times(Mat4.rotation(-Math.PI / 4, 0, -1, 0));  // Rotate to be slanted
            roof_transform = roof_transform.times(Mat4.scale(0.75, 1, Math.sqrt(2) / 2));  // Scale to cover the top of the cube
            this.shapes.square.draw(context, program_state, roof_transform, this.materials.house.override({color: mixed_color}));

            // Draw the first triangle
            let triangle_transform = model_transform;
            triangle_transform = triangle_transform.times(Mat4.translation(0, 1, 2));  // Move to top of the cube
            triangle_transform = triangle_transform.times(Mat4.rotation(Math.PI / 2, -1, 0, 0));  // Rotate to be perpendicular to the roof
            triangle_transform = triangle_transform.times(Mat4.rotation(Math.PI / 4, 0, 0, 1));  // Rotate to be perpendicular to the roof
            triangle_transform = triangle_transform.times(Mat4.scale(1.5, 1.5, 1.5));  // Scale to cover the triangular hole
            this.shapes.triangle.draw(context, program_state, triangle_transform, this.materials.house.override({color: mixed_color}));

            // Draw the second triangle
            triangle_transform = model_transform;
            triangle_transform = triangle_transform.times(Mat4.translation(0, -1, 2));  // Move to top of the cube
            triangle_transform = triangle_transform.times(Mat4.rotation(Math.PI / 2, -1, 0, 0));  // Rotate to be perpendicula
            triangle_transform = triangle_transform.times(Mat4.rotation(Math.PI / 4, 0, 0, 1));  // Rotate to be perpendicular to the roof
            triangle_transform = triangle_transform.times(Mat4.scale(1.5, 1.5, 1.5));  // Scale to cover the triangular hole
            this.shapes.triangle.draw(context, program_state, triangle_transform, this.materials.house.override({color: mixed_color}));

            //Draw door
            let door_transform = model_transform;
            door_transform = door_transform.times(Mat4.translation(0, -1.05, -0.3));
            door_transform = door_transform.times(Mat4.scale(0.3, 0.3, 0.5));
            door_transform = door_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, door_transform, this.materials.door)

            //draw windows

            //front face
            let window_transform = model_transform.times(Mat4.translation(0.5, -1.01, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.15, 0.15, 0.15));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(-0.5, -1.01, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.15, 0.15, 0.15));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            //left side face
            window_transform = model_transform.times(Mat4.translation(-1.01, -0.5, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(-1.01, 0.5, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            //right side face
            window_transform = model_transform.times(Mat4.translation(1.01, -0.5, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);

            window_transform = model_transform.times(Mat4.translation(1.01, 0.5, 0.5));
            window_transform = window_transform.times(Mat4.scale(0.2, 0.2, 0.2));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, -1, 0, 0));
            window_transform = window_transform.times(Mat4.rotation(Math.PI / 2.0, 0, -1, 0));
            this.shapes.square.draw(context, program_state, window_transform, this.materials.window);
            let pair = [x,y]
            this.occupied_coordinates.push(pair);

    }
       draw_ground(context, program_state, x, y) {
        const tile_size = 2; // Size of each ground tile
        const grid_size = 32; // 8x8 grid of tiles

        for (let i = 0; i < grid_size; i++) {
            for (let j = 0; j < grid_size; j++) {
                let model_transform = Mat4.identity().times(Mat4.translation((i - grid_size / 2) * tile_size, (j - grid_size / 2) * tile_size, -1.9));
                model_transform = Mat4.scale(tile_size, tile_size, 1).times(model_transform);
                this.shapes.square.draw(context, program_state, model_transform, this.materials.ground_texture);
            }
        }
    }

    draw_tower (context, program_state, x, y)  {
        this.shapes.cylinder.draw(
            context, program_state,
            Mat4.identity().times(Mat4.translation(x,y,0)).times(Mat4.scale(1.2,1.2,8.5)),
            this.materials.tower_blue
        );
        const window_positions = [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
        for (let i = 0; i < window_positions.length; i++) {
            this.shapes.cylinder.draw(
                context, program_state, Mat4.identity().times(Mat4.translation(x,y,window_positions[i])).times(Mat4.scale(1.201,1.201,0.2)),
                this.materials.tower_window
            );
        }
        this.shapes.cylinder.draw(
            context, program_state,
            Mat4.identity().times(Mat4.translation(x,y,4.26)).times(Mat4.scale(1.2,1.2,0)),
            this.materials.helipad_texture
        );
        this.shapes.cube.draw(
            context, program_state,
            Mat4.identity().times(Mat4.translation(x,y,-1.9)).times(Mat4.scale(1.5,1.5,1.5)),
            this.materials.tower_blue
        );
        this.shapes.square.draw(
            context, program_state,
            Mat4.identity().times(Mat4.translation(x,y-1.51,-1.5)).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.rotation(Math.PI / 2.0, -1,0,0)),
            this.materials.door
        );
    }

    draw_OfficeBuilding(context, program_state, grid_location) {
        // grid_location is grid coordinates (0,0) corresponds to the area between (0,0) and (4,4)
        // rotation is 0 or 1, corresponding to
        // Scale -> rotate -> translate
        const black = hex_color("#000000");
        let office_transform = Mat4.translation(grid_location[0]*4,grid_location[1]*4,-1.2).times(Mat4.scale(1.5,1,1.5));
        this.shapes.cube.draw(context, program_state, office_transform, this.materials.building1);
        let window_transform = Mat4.translation(grid_location[0]*4-1,grid_location[1]*4-1.001,-.3).times(Mat4.rotation(Math.PI/2,1,0,0)).times(Mat4.scale(.1,.15,1));
        for(let z = 0; z<2; z++) {
            for (let j = 0; j < 3; j++) {
                for (let i = 0; i < 5; i++) {
                    this.shapes.square.draw(context, program_state, window_transform, this.materials.building1.override({color: black}));
                    window_transform = Mat4.translation(.5, 0, 0).times(window_transform);
                }
                window_transform = Mat4.translation(-2.5, 0, -.5).times(window_transform);
            }
            window_transform = Mat4.translation(0,2.002,1.5).times(window_transform);
        }
    }

    draw_lighting(context, program_state) {
        const t = program_state.animation_time / 1000;
        let daynight_length = 20;
        let light_distance = 4;
        let sun_location = vec4(light_distance*Math.cos(Math.PI*t/daynight_length),0,light_distance*Math.sin(Math.PI*t/daynight_length),1.0);
        let moon_location = vec4(light_distance*Math.cos(Math.PI*t/daynight_length-Math.PI),0,light_distance*Math.sin(Math.PI*t/daynight_length-Math.PI),1.0);
        let sunlight_color = color(1,.75+.25*Math.sin(Math.PI*t/daynight_length), .5+.5*Math.sin(Math.PI*t/daynight_length), 1);
        let sun_color = color(1,.5+.5*Math.sin(Math.PI*t/daynight_length), 0, 1);
        let moonlight_color = color(1,1,1);
        let moon_color = hex_color("#FFFFD4");
        //if(t % (daynight_length*2) <= daynight_length) {
            program_state.lights = [new Light(sun_location, sunlight_color, 100000)];
            //this.shapes.sphere.draw(context, program_state, Mat4.translation(sun_location[0],sun_location[1],sun_location[2]),this.materials.sunMaterial.override({color: sun_color}));
        //}
        if(t % (daynight_length*2) > daynight_length) {
            program_state.lights = [new Light(moon_location, moonlight_color, 10000)];
            //this.shapes.sphere.draw(context, program_state, Mat4.translation(moon_location[0],moon_location[1],moon_location[2]),this.materials.sunMaterial.override({color: moon_color}));

        }
    }


    display(context, program_state) {
        //console.log(this.current_y_speed)
        //console.log (this.desired_camera_y, this.camera_y)

        const draw_selected_tile = (selected) => {
            this.shapes.square.draw(
                context, program_state,
                Mat4.identity().times(
                    Mat4.translation(selected[0]*4,selected[1]*4,-1.9)
                ).times(
                    Mat4.scale(2,2,0)
                ),
                this.materials.selected_square
            );
        }

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        if (! this.in_superhero_mode) {
            // Camera Control
            if (this.camera_z < this.desired_camera_y) {
                this.current_y_speed = Math.min(((this.desired_camera_y - this.camera_z) / 5), this.base_speed)
                this.camera_z += this.current_y_speed
                if (Math.abs(this.camera_z - this.desired_camera_y) < 0.001) {
                    this.camera_z = this.desired_camera_y;
                    this.current_y_speed = this.base_speed;
                }
            } else if (this.camera_z > this.desired_camera_y) {
                console.log(this.desired_camera_y)
                this.current_y_speed = Math.max(((this.desired_camera_y - this.camera_z) / 5), -this.base_speed)
                this.camera_z += this.current_y_speed;
                if (Math.abs(this.camera_z - this.desired_camera_y) < 0.001) {
                    this.camera_z = this.desired_camera_y;
                    this.current_y_speed = this.base_speed;
                }
            } else {
                this.current_y_speed = this.base_speed;
            }
            // Camera Control
            if (this.camera_x < this.desired_camera_x) {
                this.current_x_speed = Math.min(((this.desired_camera_x - this.camera_x) / 5), this.base_speed)
                this.camera_x += this.current_x_speed
                if (Math.abs(this.camera_x - this.desired_camera_x) < 0.001) {
                    this.camera_x = this.desired_camera_x;
                    this.current_x_speed = this.base_speed;
                }
            } else if (this.camera_x > this.desired_camera_x) {
                console.log(this.desired_camera_x)
                this.current_x_speed = Math.max(((this.desired_camera_x - this.camera_x) / 5), -this.base_speed)
                this.camera_x += this.current_x_speed;
                if (Math.abs(this.camera_x - this.desired_camera_x) < 0.001) {
                    this.camera_x = this.desired_camera_x;
                    this.current_x_speed = this.base_speed;
                }
            } else {
                this.current_x_speed = this.base_speed
            }
            const desired_camera_matrix = Mat4.inverse(
                Mat4.identity().times(
                    Mat4.translation(
                        this.camera_x,this.camera_z,this.camera_y
                    )
                ).times(Mat4.rotation(Math.PI/6, 1,0,0))
            );
            program_state.set_camera(desired_camera_matrix);
        } else {
            // In Superhero mode

            // Update acceleration based on boost
            if (this.superhero_boost_time > 90) {
                this.superhero_accel_forward = 0.011 * Math.sin(this.superhero_tilt_angle);
                this.superhero_accel_y = -0.011 * Math.cos(this.superhero_tilt_angle) + 0.01;
                this.superhero_boost_time--;
            } else if (this.superhero_boost_time < 90 && this.superhero_boost_time > 0) {
                this.superhero_accel_forward -= 0.01/90;
                this.superhero_boost_time--;
            } else {
                this.superhero_accel_z = 0;
                this.superhero_accel_y = 0;
                this.superhero_boost_time = 0;
            }

            // Update acceleration based on jump
            if (this.superhero_jump_time > 0) {
                this.superhero_accel_y += 0.02;
                this.superhero_jump_time--;
            } else {
                this.superhero_accel_y += GRAVITY
                this.superhero_jump_time = 0;
            }
            // Collision detection
            if (this.lower_collision().result) {
                this.superhero_accel_y = 0;
                this.superhero_velocity_y = 0;
                this.camera_z = this.lower_collision().edge;
                /*if (this.superhero_velocity_forward > 0.05 && ! this.superhero_moving_forward) {
                    this.superhero_accel_forward = -0.02;
                } else if (!this.superhero_moving_forward) {
                    this.superhero_velocity_forward = 0;
                    this.superhero_accel_forward = 0;
                }*/
                if (! this.superhero_moving_forward) {
                    this.superhero_velocity_forward = 0;
                    this.superhero_accel_forward = 0;
                }
                console.log("boing")
                if (Math.abs(this.superhero_tilt_angle - Math.PI / 2) < Math.PI/25) {
                    this.superhero_tilt_angle = Math.PI/2
                    this.superhero_tilt_angular_velocity = 0;
                }
                else if (Math.PI/2 < this.superhero_tilt_angle) {
                    this.superhero_tilt_angular_velocity = -Math.PI/50
                } else if (Math.PI/2 > this.superhero_tilt_angle) {
                    this.superhero_tilt_angular_velocity = Math.PI/50;
                }
                //this.superhero_tilt_angle = Math.PI/2;
            } else {
                console.log("wizz");
                // Air Resistance
                if (this.superhero_boost_time < 90) {
                    if(this.superhero_accel_forward > 0) {
                        this.superhero_accel_forward = -0.01
                    } else if (this.superhero_accel_forward < 0) {
                        this.superhero_accel_forward = 0.01
                    }
                }
            }
            if (! this.superhero_panning) {
                this.superhero_pan_angular_velocity = 0;
            }


            // Update velocities based on accelerations
            //this.superhero_velocity_z += this.superhero_accel_forward * Math.sin(this.superhero_pan_angle);
            this.superhero_velocity_y += this.superhero_accel_y;
            //this.superhero_velocity_x += this.superhero_accel_forward * Math.cos(this.superhero_pan_angle);
            this.superhero_velocity_forward += this.superhero_accel_forward;
            // Update camera position
            this.camera_y += this.superhero_velocity_forward * Math.cos(this.superhero_pan_angle);
            this.camera_z += this.superhero_velocity_y;
            this.camera_x += -this.superhero_velocity_forward * Math.sin(this.superhero_pan_angle);
            this.superhero_roll_angle += this.superhero_roll_angular_velocity;
            this.superhero_tilt_angle += this.superhero_tilt_angular_velocity;
            this.superhero_pan_angle += this.superhero_pan_angular_velocity;
            console.log(this.superhero_tilt_angle);
            console.log(this.camera_x, this.camera_z, this.camera_y);
            this.hazard_collision();


            if (this.superhero_tilt_angle > Math.PI ) {
                this.superhero_tilt_angle = Math.PI;
            }
            if (this.superhero_tilt_angle <  0) {
                this.superhero_tilt_angle = 0;
            }

            // Set camera matrix
            const desired_camera_matrix = Mat4.inverse(
                Mat4.identity().times(
                    Mat4.translation(this.camera_x, this.camera_y, this.camera_z)
                ).times(
                    Mat4.rotation(this.superhero_pan_angle, 0,0,1)
                ).times(
                    Mat4.rotation(this.superhero_tilt_angle,1   ,0,0)
                )
            );
            /*const desired_camera_matrix = Mat4.look_at(
                vec3(this.camera_x, this.camera_y, this.camera_z),
                vec3(this.camera_x + (5 * Math.sin(this.superhero_pan_angle)), this.camera_y + (5 * Math.sin(this.superhero_tilt_angle)), this.camera_z + (5 * Math.cos(this.superhero_pan_angle))),
                vec3(0 ,1,0)

            )*/
            //const desired_camera_matrix = Mat4.look_at(vec3(this.camera_x, this.camera_y, this.camera_z), vec3(0,0,0), vec3(0,0,1))
            program_state.set_camera(desired_camera_matrix);
        }

        this.draw_lighting(context, program_state);
        this.hazard_movement();
        //program_state.lights = [new Light(vec4(-6, -6, 20, 1), color(1,1,1), 10000)];
        //for houses
        const pink = hex_color("#FFC0CB")
        //this.draw_house(context, program_state, 4,4, pink)

        //this.shapes.axis.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,0,5)), this.materials.planet1);


        this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,0,-2)).times(Mat4.scale(20,20,20)), this.materials.planet1)
        if (!this.in_superhero_mode) {
            draw_selected_tile(this.selection)
        }
        for (let i = 0; i < this.towers.length; i++) {
            this.draw_tower(context, program_state, this.towers[i][0] * 4 ,this.towers[i][1] * 4);
        }
        for (let i = 0; i < this.houses.length; i++){
            this.draw_house(context, program_state, this.houses[i][0] * 4, this.houses[i][1] * 4, pink);
        }
        for (let i = 0; i < this.buildings.length; i++){
            this.draw_building(context, program_state, this.buildings[i][0] * 4, this.houses[i][1] * 4, 5);
        }
        for (let i = 0; i < this.offices.length; i++){
            let temp = [this.offices[i][0], this.offices[i][1]];
            this.draw_OfficeBuilding(context, program_state, temp);
        }
        for (let i = 0; i < this.hazards.length; i++) {

            this.draw_hazard(context, program_state, this.hazards[i][0], this.hazards[i][1], this.hazards[i][2], hex_color("#cb7878"));
        }
        this.draw_ground(context, program_state, 0, 0);
    }
}

