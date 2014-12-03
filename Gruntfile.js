module.exports = function(grunt) {

  grunt.initConfig({
    less: {
      development: {
        options: {
          compress: false,
        },
        files: {
          "./public/css/main.css":"./app/css/main.less",
        }
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      js: {
        src: [
          './bower_components/jquery/dist/jquery.js',
          './bower_components/bootstrap/dist/js/bootstrap.js',
          './bower_components/d3/d3.js',
          './app/js/app.js'
        ],
        dest: './public/js/app.js'
      }
    },
    uglify: {
      options: {
        mangle: false
      },
      js: {
        files: {
          './public/js/app.min.js': './public/js/app.js'
	}
      }
    },
    watch: {
      less: {
        files: ['./app/css/*.less'],
        tasks: ['less']
      },
      js: {
        files: ['./app/js/*.js'],
        tasks: ['concat:js','uglify:js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['watch']);
};
