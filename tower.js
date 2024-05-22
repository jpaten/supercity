
export const draw_tower = (context, program_state, x,y) => {
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
    )
    this.shapes.cube.draw(
        context, program_state,
        Mat4.identity().times(Mat4.translation(x,y,-1.9)).times(Mat4.scale(1.5,1.5,1.5)),
        this.materials.tower_blue
    )
    this.shapes.square.draw(
        context, program_state,
        Mat4.identity().times(Mat4.translation(x,y-1.51,-1.5)).times(Mat4.scale(0.5,0.5,0.5)).times(Mat4.rotation(Math.PI / 2.0, -1,0,0)),
        this.materials.door
    )
}