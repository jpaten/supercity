import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const BASE_Z = -2
const compare_coords = (a,b) => (a[0] === b[0]) && (a[1] === b[1])

export class SuperCity extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            square: new defs.Square(3),
            cylinder: new defs.Capped_Cylinder(50,50),
            cube: new defs.Cube(),
            triangle: new defs.Triangle()

            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
        };

        // *** Materials
        this.materials = {
            planet1: new Material(new defs.Phong_Shader(),
                {color: hex_color("#969696"), ambient: 0, specularity: 0, diffusivity: 1}),
            house: new Material(new defs.Phong_Shader(),
                {color: hex_color("#FFC0CB"), ambient: 0.5, specularity: 0.5, diffusivity: 0.5}),
            tower_blue: new Material(new defs.Phong_Shader(),
                {color: hex_color("#5576a9"), ambient: 0.2, specularity: 0, diffusivity: 0.1}),
            tower_window: new Material(new defs.Phong_Shader(),
                {color: hex_color("#DDDDDD"), ambient: 1, specularity: 0.1, diffusivity: 0.4}),
            helipad_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), texture: new Texture("./assets/helipad.png"), ambient: 1}),
            door: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), texture: new Texture("./assets/door.png"), ambient:1}),
            selected_square: new Material(new defs.Phong_Shader(),
                {color: hex_color("#64f63f"), ambient: 0.5, specularity: 0, diffusivity: 0.5}),
            ground_texture: new Material(new defs.Textured_Phong(),
                {color: hex_color("#000000"), texture: new Texture("./assets/ground.png"), ambient: 1}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, -3, 5), vec3(0,0, 0), vec3(0, 1, 0));
        this.selection = [0,1];
        this.towers = [[2,2], [-1,-1]];
        this.houses = [[1,3], [1,1]];

        this.desired_camera_x = 0
        this.desired_camera_y = -5
        this.base_speed = 0.2;
        this.current_y_speed = this.base_speed;
        this.current_x_speed = this.base_speed;
        this.camera_x = this.desired_camera_x;
        this.camera_y = this.desired_camera_y;
        this.step = 1;
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

    remove(x,y) {
        this.towers = this.towers.filter((i) => (i[0] !== x) || (i[1] !== y));
        this.houses = this.houses.filter((i) => (i[0] !== x) || (i[1] !== y));
    }

    move_up () {
        if (this.current_y_speed < 0 || Math.abs(this.desired_camera_y - this.camera_y) < this.current_y_speed*5) {
            this.desired_camera_y += this.step;
        }
    }
    move_down () {
        if (this.current_y_speed > 0 || Math.abs(this.desired_camera_y - this.camera_y) < -this.current_y_speed * 5){
            this.desired_camera_y -= this.step
        }
    }
    move_right () {
        if (this.current_x_speed < 0 || Math.abs(this.desired_camera_x - this.camera_x) < this.current_x_speed*5) {
            this.desired_camera_x += this.step;
        }
    }
    move_left () {
        if (this.current_x_speed > 0 || Math.abs(this.desired_camera_x - this.camera_x) < -this.current_x_speed * 5){
            this.desired_camera_x -= this.step
        }
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Move up", ["ArrowUp"], this.move_up)
            //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y) < this.current_y_speed *10 ? this.step : 0));
            //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y)) < )
        this.key_triggered_button("Move down", ["ArrowDown"], this.move_down);
        this.new_line()
        this.key_triggered_button("Move left", ["ArrowLeft"], this.move_left)
        //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y) < this.current_y_speed *10 ? this.step : 0));
        //() => this.desired_camera_y += (Math.abs(this.desired_camera_y - this.camera_y)) < )
        this.key_triggered_button("Move right", ["ArrowRight"], this.move_right);

        this.key_triggered_button("Select up", ["Alt", "ArrowUp"], () => this.selection[1]++);
        this.key_triggered_button("Select down", ["Alt","ArrowDown"], () => this.selection[1]--);
        this.new_line();
        this.key_triggered_button("Select left", ["Alt", "ArrowLeft"], () => this.selection[0]--);
        this.key_triggered_button("Select right", ["Alt", "ArrowRight"], () => this.selection[0]++);
        this.new_line();
        this.key_triggered_button("Demolish", ["e"], () => this.remove_tower(this.selection[0], this.selection[1]));
        this.new_line();
        this.key_triggered_button("Build tower", ["t"], () => this.add_tower(this.selection[0], this.selection[1]));
        this.key_triggered_button("Build house", ["h"], () => this.add_house(this.selection[0], this.selection[1]));
    }
    draw_house(context, program_state, x, y, color)
    {
        let model_transform = Mat4.identity().times(Mat4.translation(x,y,-1))
        const new_model_transform = model_transform;
        //this.draw_ground(context, program_state, x, y)
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.house.override({color:color}));

        model_transform = Mat4.rotation(Math.PI/6, 0, -1, 0).times(model_transform);
        model_transform = Mat4.translation(0.5, 0, -0.85).times(model_transform);
        model_transform = Mat4.scale(0.75,1,1.2).times(model_transform);
        const blk = vec4(0, 0, 0, 1);
        color = color.mix(blk,0.5)
        this.shapes.square.draw(context, program_state, model_transform, this.materials.house.override({color:color}));

        model_transform = Mat4.rotation( Math.PI, 0, 0, 1).times(model_transform);
        model_transform = Mat4.translation(2*x, 2*y, 0).times(model_transform);
        this.shapes.square.draw(context, program_state, model_transform, this.materials.house.override({color:color}));

        model_transform = new_model_transform
        model_transform = Mat4.rotation( 3*(Math.PI/2), 1, 0, 0).times(model_transform)
        model_transform = Mat4.rotation( (Math.PI/4), 0, 1, 0).times(model_transform)
        model_transform = Mat4.scale(1.5,1.5,1.5).times(model_transform);
        model_transform = Mat4.translation(x, y+0.5, 9.5).times(model_transform);
        this.shapes.triangle.draw(context, program_state, model_transform, this.materials.house.override({color:color}));
        model_transform = Mat4.translation(0, 2, 0).times(model_transform);
        this.shapes.triangle.draw(context, program_state, model_transform, this.materials.house.override({color:color}));


    }
    draw_ground(context, program_state, x, y)
    {
        let model_transform = Mat4.identity().times(Mat4.translation(x/2,y/2,-1.9))
        model_transform = Mat4.scale(2,2,1).times(model_transform);
        this.shapes.square.draw(context, program_state, model_transform, this.materials.ground_texture);
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
            Mat4.identity().times(Mat4.translation(x,y,4.62)).times(Mat4.scale(1.2,1.2,0)),
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

        // Camera Control
        if (this.camera_y < this.desired_camera_y) {
            this.current_y_speed = Math.min(((this.desired_camera_y - this.camera_y) / 5), this.base_speed)
            this.camera_y += this.current_y_speed
            if (Math.abs(this.camera_y - this.desired_camera_y) < 0.001) {
                this.camera_y = this.desired_camera_y;
                this.current_y_speed = this.base_speed;
            }
        } else if (this.camera_y > this.desired_camera_y) {
            console.log(this.desired_camera_y)
            this.current_y_speed = Math.max(((this.desired_camera_y - this.camera_y) / 5), -this.base_speed)
            this.camera_y += this.current_y_speed;
            if (Math.abs(this.camera_y - this.desired_camera_y) < 0.001) {
                this.camera_y = this.desired_camera_y;
                this.current_y_speed = this.base_speed;
            }
        } else {
            this.current_y_speed = this.base_speed
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
        const desired_camera_matrix = Mat4.inverse(Mat4.identity().times(Mat4.translation(this.camera_x,this.camera_y,20)).times(Mat4.rotation(Math.PI/6, 1,0,0)));
        program_state.set_camera(desired_camera_matrix);


        program_state.lights = [new Light(vec4(-6, -6, 20, 1), color(1,1,1), 10000)];

        //for houses
        const pink = hex_color("#FFC0CB")
        //this.draw_house(context, program_state, 4,4, pink)



        this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,0,-2)).times(Mat4.scale(20,20,20)), this.materials.planet1)
        draw_selected_tile(this.selection)
        for (let i = 0; i < this.towers.length; i++) {
            this.draw_tower(context, program_state, this.towers[i][0] * 4 ,this.towers[i][1] * 4);
        }
        for (let i = 0; i < this.houses.length; i++){
            this.draw_house(context, program_state, this.houses[i][0] * 4, this.houses[i][1] * 4, pink);
        }


        //this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(0,-1,-2)), this.materials.planet1)
        //this.shapes.square.draw(context, program_state, Mat4.identity().times(Mat4.translation(-2,-2,-2)), this.materials.planet1)



    }
}

