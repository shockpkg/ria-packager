package {
	import flash.display.MovieClip;
	import flash.text.TextField;

	public class HelloWorld extends MovieClip {
		public function HelloWorld() {
			var hello: TextField = new TextField();
			hello.text = 'Hello World!';
			this.addChild(hello);
		}
	}
}
